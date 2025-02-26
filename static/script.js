document.addEventListener("DOMContentLoaded", function () {
    const form = document.querySelector("#upload-form");
    const fileInput = document.querySelector("#image-input");
    const canvas = document.querySelector("#image-preview");
    const ctx = canvas.getContext("2d");
    const scaleSlider = document.querySelector("#scale-slider");
    const previewImageData = document.querySelector("#preview-image-data");
    const downloadButton = document.querySelector("#download-button");

        // Add this near the top of your script.js file, after the other query selectors
    const uploadButton = document.querySelector("#upload-button");

  
    let img = new Image();
    let processedImg = new Image();
    let originalImg = new Image();
    let background = new Image();
    let scale = 1;
    let offsetX = 0, offsetY = 0;
    let isDragging = false;
    let startX, startY;
    let isProcessed = false;
    const DEFAULT_SCALE = 1;
    const MIN_SCALE = 0.2;
    const MAX_SCALE = 3;

    

    // Processing animations
    const processingCircle = document.createElement("div");
    processingCircle.id = "processing-circle";
    processingCircle.classList.add("processing-circle");
    processingCircle.style.display = "none";

    const starContainer = document.createElement("div");
    starContainer.id = "star-container";

    // Append elements
    document.getElementById("preview-container").appendChild(processingCircle);
    document.getElementById("preview-container").appendChild(starContainer);

    // Load default background
    background.src = "/static/Template.jpg";
    background.onload = function () {
        drawImage();
    };

    function drawImage() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
        if (isProcessed && processedImg.src) {
            ctx.drawImage(processedImg, offsetX, offsetY, processedImg.width * scale, processedImg.height * scale);
        } else if (img.src) {
            ctx.drawImage(img, offsetX, offsetY, img.width * scale, img.height * scale);
        }
    }

    function showProcessingEffects() {
        processingCircle.style.display = "block";
        generateStars();
    }

    function hideProcessingEffects() {
        processingCircle.style.display = "none";
        starContainer.innerHTML = "";
    }

    function generateStars() {
        starContainer.innerHTML = "";
        for (let i = 0; i < 10; i++) {
            const star = document.createElement("div");
            star.classList.add("star");
            star.style.top = Math.random() * 100 + "%";
            star.style.left = Math.random() * 100 + "%";
            star.style.animationDelay = Math.random() * 1.5 + "s";
            starContainer.appendChild(star);
        }
    }

    function fitImageToBox() {
        const maxWidth = canvas.width;
        const maxHeight = canvas.height;
        const imgWidth = img.width;
        const imgHeight = img.height;
        const widthRatio = maxWidth / imgWidth;
        const heightRatio = maxHeight / imgHeight;
        scale = Math.min(widthRatio, heightRatio, DEFAULT_SCALE);

        offsetX = (canvas.width - imgWidth * scale) / 2;
        offsetY = (canvas.height - imgHeight * scale) / 2;
        
        // Reset slider to center position
        scaleSlider.value = 0;
    }
      // Add this event listener after the other event listeners
      uploadButton.addEventListener("click", function() {
        fileInput.click();
    });
    fileInput.addEventListener("change", function (event) {
        isProcessed = false;
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                originalImg.src = e.target.result;
                img.src = e.target.result;
                img.onload = function () {
                    fitImageToBox();
                    drawImage();
                };
            };
            reader.readAsDataURL(file);
        }
    });

    // Convert slider value to actual scale
    function sliderValueToScale(value) {
        // Convert from [-2, 2] range to [MIN_SCALE, MAX_SCALE]
        if (value === 0) return DEFAULT_SCALE;
        if (value < 0) {
            // Map negative values [-2, 0) to [MIN_SCALE, 1)
            return MIN_SCALE + (DEFAULT_SCALE - MIN_SCALE) * (value + 2) / 2;
        } else {
            // Map positive values (0, 2] to (1, MAX_SCALE]
            return DEFAULT_SCALE + (MAX_SCALE - DEFAULT_SCALE) * value / 2;
        }
    }

    // Handle zooming using slider
    scaleSlider.addEventListener("input", function () {
        const sliderValue = parseFloat(scaleSlider.value);
        const newScale = sliderValueToScale(sliderValue);
        const previousScale = scale;
        
        // Adjust offset to keep the image centered while zooming
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        offsetX = centerX - (centerX - offsetX) * (newScale / previousScale);
        offsetY = centerY - (centerY - offsetY) * (newScale / previousScale);
        
        scale = newScale;
        drawImage();
    });

    // Handle dragging (Positioning)
    canvas.addEventListener("mousedown", function (event) {
        isDragging = true;
        startX = event.clientX - offsetX;
        startY = event.clientY - offsetY;
    });

    canvas.addEventListener("mousemove", function (event) {
        if (isDragging) {
            offsetX = event.clientX - startX;
            offsetY = event.clientY - startY;
            drawImage();
        }
    });

    canvas.addEventListener("mouseup", function () {
        isDragging = false;
    });

    canvas.addEventListener("mouseleave", function () {
        isDragging = false;
    });

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        if (!fileInput.files.length) {
            alert("Please select an image before removing the background.");
            return;
        }

        showProcessingEffects();

        const formData = new FormData(form);
        formData.append("scale", scale);
        formData.append("offsetX", offsetX);
        formData.append("offsetY", offsetY);
        formData.append("original_image", fileInput.files[0]);

        fetch("/process", {
            method: "POST",
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            hideProcessingEffects();
            if (data.error) {
                alert("Error: " + data.error);
            } else if (data.processed_image) {
                processedImg.src = data.processed_image;
                processedImg.onload = function () {
                    isProcessed = true;
                    drawImage();
                    downloadButton.style.display = "block";
                };
            }
        })
        .catch(error => {
            hideProcessingEffects();
            console.error("Error:", error);
            alert("Failed to process image. Check console for details.");
        });
    });

    downloadButton.addEventListener("click", function () {
        const downloadCanvas = document.createElement("canvas");
        downloadCanvas.width = canvas.width;
        downloadCanvas.height = canvas.height;
        const downloadCtx = downloadCanvas.getContext("2d");

        downloadCtx.drawImage(background, 0, 0, canvas.width, canvas.height);
        downloadCtx.drawImage(processedImg, offsetX, offsetY, processedImg.width * scale, processedImg.height * scale);

        const link = document.createElement("a");
        link.download = "processed_image.png";
        link.href = downloadCanvas.toDataURL("image/png");
        link.click();
    });
});