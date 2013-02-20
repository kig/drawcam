DrawCam = function(canvas) {
    this.canvas = canvas;
    this.init();
};

DrawCam.prototype.init = function() {
    this.drawer = this.draw.bind(this);
    navigator.getMedia(
        {video: true},
        (function(stream) {
            var screen = E.id('screen');
            E.fadeIn(screen);
            screen.style.display = 'block';
            var video = document.createElement('video');
            video.width = this.canvas.width;
            video.height = this.canvas.height;
            video.autoplay = true;
            this.video = video;
            this.video.onmetadataloaded = function() {
                this.play();
            };
            this.videoCanvas = document.createElement('canvas');
            this.videoCanvas.width = video.width;
            this.videoCanvas.height = video.height;
            var url = window.URL.createObjectURL(stream);
            video.src = url;
            this.startUpdatingVideo();
        }).bind(this),
        function(err) {
            showAllowError();
        }
        
    );
};

DrawCam.prototype.startUpdatingVideo = function() {
    this.videoOn = true;
    this.drawer();
};

DrawCam.prototype.draw = function() {
    E.requestSharedAnimationFrame(this.drawer, this.canvas);
    if (this.videoOn) {
        var vc = this.videoCanvas;
        var ctx = vc.getContext('2d');
        ctx.clearRect(0, 0, vc.width, vc.height);
        ctx.drawImage(this.video, 0, 0, vc.width, vc.height);
        var px = Filters.horizontalFlip(Filters.getPixels(vc));
        var threshold = parseInt(document.getElementById('threshold').value);
        var filter = document.getElementById('hatchFilter').value;

        var hatchStride = 6;
        var shadowTone = {name: 'applyLUT', args: [{
            r: {0: 30, 255: 255}, 
            g: {0: 100, 255: 255},
            b: {0: 225, 255: 255},
            a: Filters.identityLUT()
        }]};
        var lightTone = {name: 'applyLUT', args: [{
            r: {0: 30, 255: 255}, 
            g: {0: 150, 255: 255},
            b: {0: 255, 255: 255},
            a: Filters.identityLUT()
        }]};

        var nnpx = null;
        var hatchPipeline = [];
        switch (filter) {
            case 'circle':
            hatchPipeline.push({name: 'circleHatch', args: [px, hatchStride, threshold]});
            break;
            case 'hatch45':
            hatchPipeline.push({name: 'hatch45', args: [px, hatchStride, threshold]});
            break;
            case 'hatch315':
            hatchPipeline.push({name: 'hatch315', args: [px, hatchStride, threshold]});
            break;
        }
        if (hatchPipeline.length > 0) {
            hatchPipeline.push(shadowTone);
            nnpx = Filters.runPipeline(hatchPipeline);
        }
        var nnnpx = Filters.runPipeline([
            {name: 'threshold', args: [px, threshold]},
            {name: 'erode', args: []},
            shadowTone
        ]);
        var pipeline = [
            {name: 'sobel', args: [px]},
            {name: 'threshold', args: [32, 0, 255]},
            {name: 'erode', args: []},
            lightTone,
            {name: 'darkenBlend', args: [nnnpx]}
        ];
        if (nnpx) {
            pipeline.push({name: 'darkenBlend', args: [nnpx]});
        }
        var npx = Filters.runPipeline(pipeline);
        this.canvas.getContext('2d').putImageData(npx, 0, 0);
    }
    if (!this.fadedBg) {
        this.fadedBg = true;
        E.fadeOut(E.id('bg'));
    }
};

DrawCam.prototype.save = function() {
    var du = this.canvas.toDataURL();
    var a = document.createElement('a');
    a.href = du;
    if (a.hasOwnProperty('download')) {
        a.download = 'drawcam.png';
        a.mimeType = 'image/png';
        a.click();
    } else {
        a.display = 'block';
        a.target = '_blank';
        a.innerHTML = 'Saved Picture';
        document.getElementById('controls').appendChild(document.createElement('hr'));
        document.getElementById('controls').appendChild(a);
    }
    
};

DrawCam.prototype.resize = function(w,h) {
    this.video.width = this.canvas.width = this.videoCanvas.width = w;
    this.video.height = this.canvas.height = this.videoCanvas.height = h;
};

showAllowError = function() {
    E.fadeOut(E.id('screen'));
    var allow = E.id('allow');
    E.css(allow, 'transition', '0.5s');
    E.css(allow, 'opacity', 0);
    var e = E.id('allow-error');
    E.fadeIn(e);
    e.style.marginTop = '-10px';
};

showError = function() {
    E.fadeOut(E.id('screen'));
    var allow = E.id('allow');
    E.css(allow, 'transition', '0.5s');
    E.css(allow, 'opacity', 0);
    var e = E.id('error');
    E.fadeIn(e);
    e.style.marginTop = '-10px';
    var animateInButton = function(id, dst, x, y, offset) {
        var btn = E.id(id);
        E.css(btn, 'transformOrigin', '50% 50%');
        E.css(btn, 'transform', 'translate('+x+'px,'+y+'px) scale(1) rotate(0deg)');
        var img = E.tag('img', btn)[0];
        img.onload = function() {
            E.css(btn, 'transition', '0.5s');
            E.css(btn, 'transform', 'translate(0px,0px) scale(1) rotate('+dst+'deg)');
            E.css(btn, 'opacity', 1);
        };
        if (img.complete) {
            setTimeout(img.onload, offset);
        }
    };
    animateInButton('chrome-button', 720, 0, 200, 200);
    animateInButton('firefox-button', -720, 0, -200, 0);
    animateInButton('opera-button', 720, 200, 0, 400);
};

window.addEventListener('load', function() {
    var img = E('img');
    var bg = E.id('bg');
    E.css(bg, 'transition', '1s');
    img.onload = function() {
        bg.style.opacity = 0.2;
    };
    img.src = 'drawcam.png';
    if (!navigator.getMedia) {
        showError();
    } else {
        dc = new DrawCam(document.getElementById('canvas'));
        // hack around Opera's non-aspect scale when doing width: 100%
        window.addEventListener('resize', function() {
            E.sz(dc.canvas, window.innerWidth, 3/4 * window.innerWidth);
        }, false);
        E.sz(dc.canvas, window.innerWidth, 3/4 * window.innerWidth);
    }
}, false);

// https://developer.mozilla.org/en-US/docs/WebRTC/navigator.getUserMedia

navigator.getMedia = ( navigator.getUserMedia ||
                       navigator.webkitGetUserMedia ||
                       navigator.mozGetUserMedia ||
                       navigator.msGetUserMedia);
// Firefox 1x has a disabled getUserMedia
if (/Firefox\/1\d\.\d+$/.test(navigator.userAgent)) {
    navigator.getMedia = undefined;
} 
// Opera doesn't have window.URL, but this works.
if (navigator.getMedia) {
    if(!window.URL) {
        window.URL = {};
    }
    if(!window.URL.createObjectURL) {
        window.URL.createObjectURL = function(obj){ return obj; };
    }
}
