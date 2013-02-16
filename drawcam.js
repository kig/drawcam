DrawCam = function(canvas) {
    this.canvas = canvas;
    this.init();
};

DrawCam.prototype.init = function() {
    this.drawer = this.draw.bind(this);
    navigator.getMedia(
        {video: true},
        (function(stream) {
            var video = document.createElement('video');
            video.width = this.canvas.width;
            video.height = this.canvas.height;
            video.autoplay = true;
            this.video = video;
            this.videoCanvas = document.createElement('canvas');
            this.videoCanvas.width = video.width;
            this.videoCanvas.height = video.height;
            this.startUpdatingVideo();
            var url = window.URL.createObjectURL(stream);
            video.src = url;
        }).bind(this),
        function(err) {
            alert("Couldn't access webcam: " + err);
        }
        
    );
};

DrawCam.prototype.startUpdatingVideo = function() {
    this.videoOn = true;
    this.drawer();
};

DrawCam.prototype.draw = function() {
    if (this.videoOn) {
        var vc = this.videoCanvas;
        var ctx = vc.getContext('2d');
        ctx.clearRect(vc.width, vc.height);
        ctx.drawImage(this.video, 0, 0, vc.width, vc.height);
        var px = Filters.horizontalFlip(Filters.getPixels(vc));
        var t = parseInt(document.getElementById('threshold').value);
        var nnpx = Filters.runPipeline([
            {name: 'threshold', args: [px, t]},
            {name: 'erode', args: []}
        ]);
        var npx = Filters.runPipeline([
            {name: 'sobel', args: [px]},
            {name: 'threshold', args: [32, 0, 255]},
            {name: 'erode', args: []},
            {name: 'applyLUT', args: [{
                r: {0: 255, 255: 255}, 
                g: {0: 0, 255: 255},
                b: {0: 0, 255: 255},
                a: Filters.identityLUT()
            }]},
            {name: 'multiplyBlend', args: [nnpx]}
        ]);
        this.canvas.getContext('2d').putImageData(npx, 0, 0);
    }
    window.requestAnimationFrame(this.drawer, this.canvas);
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
        a.innerHTML = 'Saved Picture';
        document.body.appendChild(a);
    }
    
};

window.addEventListener('load', function() {
    dc = new DrawCam(document.getElementById('canvas'));
}, false);





// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating

// requestAnimationFrame polyfill by Erik Möller
// fixes from Paul Irish and Tino Zijdel

( function () {

    var lastTime = 0;
    var vendors = [ 'ms', 'moz', 'webkit', 'o' ];

    for ( var x = 0; x < vendors.length && !window.requestAnimationFrame; ++ x ) {

        window.requestAnimationFrame = window[ vendors[ x ] + 'RequestAnimationFrame' ];
        window.cancelAnimationFrame = window[ vendors[ x ] + 'CancelAnimationFrame' ] || window[ vendors[ x ] + 'CancelRequestAnimationFrame' ];

        }

    if ( window.requestAnimationFrame === undefined ) {

        window.requestAnimationFrame = function ( callback, element ) {

            var currTime = Date.now(), timeToCall = Math.max( 0, 16 - ( currTime - lastTime ) );
            var id = window.setTimeout( function() { callback( currTime + timeToCall ); }, timeToCall );
            lastTime = currTime + timeToCall;
            return id;

            };

        }

    window.cancelAnimationFrame = window.cancelAnimationFrame || function ( id ) { window.clearTimeout( id ); };

}() );

// https://developer.mozilla.org/en-US/docs/WebRTC/navigator.getUserMedia

navigator.getMedia = ( navigator.getUserMedia ||
                       navigator.webkitGetUserMedia ||
                       navigator.mozGetUserMedia ||
                       navigator.msGetUserMedia);
 
