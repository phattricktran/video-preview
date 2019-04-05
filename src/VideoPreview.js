import React from 'react';
import VideoData from './VideoData';

import { TweenMax, TimelineMax } from "gsap";
import * as PixiPlugin from "gsap/PixiPlugin";

const PIXI = require('pixi.js');

const hc = VideoData.highlight_color;
const highlight_color = `rgba(${hc[0]},${hc[1]},${hc[2]},${hc[3]})}`;

class VideoPreview extends React.Component {

    componentDidMount() {
        document.fonts.ready.then(() => {
            // for some reason, we need to wait a little longer still...
            window.setTimeout(() => {
                this.beginDraw(this.refs.canvas);
            }, 200);
        });
    }

    // Creates a text sprite
    createText(textContent, isBold = false) {
        let pixiText = new PIXI.Text(textContent, {
            fontFamily: VideoData.font,
            fontSize: 28,
            fill: `${ isBold ? highlight_color : 'white'}`,
            align: 'left',
            dropShadow: true,
            dropShadowDistance: 1
        });

        return pixiText
    }

    // Takes text from the VideoData and adds it to the scene
    // Return a reference to the container and masking object
    addText(text) {
        var container = new PIXI.Container();

        this.app.stage.addChild(container);

        // First split the text into three parts
        const startText = text.content.slice(0, text.keyword_indexes[0]);
        const boldText = text.content.slice(text.keyword_indexes[0], text.keyword_indexes[1]);
        const endText = text.content.slice(text.keyword_indexes[1]);

        const t0 = this.createText(startText);
        const t1 = this.createText(boldText, true);
        const t2 = this.createText(endText);

        t0.position.set(20);
        t1.position.set((20 + t0.width), 20);
        t2.position.set((20 + t0.width + t1.width), 20);

        // Create the rectangle that goes behind the text
        let tbc = VideoData.text_background_color;

        const graphics = new PIXI.Graphics();

        // Create the rectangle behind the text
        graphics.beginFill(PIXI.utils.rgb2hex([(tbc[0]/255.0), (tbc[1]/255.0), (tbc[2]/255.0)]));
        graphics.drawRect(20 - 5, 20, t0.width + t1.width + t2.width + 10, t0.height + 5);
        graphics.endFill();

        // Create a mask that is the same dimensions of the background
        const mask = new PIXI.Graphics();
        mask.beginFill('black');
        mask.drawRect(20 - 5, 20, t0.width + t1.width + t2.width + 10, t0.height + 5);
        mask.endFill();

        // Position our text
        container.addChild(graphics, mask, t0, t1, t2);
        container.alpha = 0;
        container.pivot.y = container.height / 2;
        container.y = container.parent.height / 2;
        container.mask = mask;

        // Return the container and mask so we can animate them
        return {
            container,
            mask
        };
    }

    // Resize the canvas when the window size changes
    // TODO: Should also resize and reposition the text
    resize() {
        const parent = this.app.view.parentNode;

        this.app.renderer.resize(parent.clientWidth, parent.clientHeight);

        this.videoSprite.width = this.app.screen.width;
        this.videoSprite.height = this.app.screen.height;
    }

    // Add the video to the scene
    addVideo() {
        this.video = document.createElement("video");
        this.video.preload = "auto";
        this.video.loop = true;              // enable looping
        this.video.autoplay = true;
        this.video.src = VideoData.background.mp4_url;

        // Create a video texture
        this.videoTexture = PIXI.Texture.fromVideo(this.video);
        this.videoSprite = new PIXI.Sprite(this.videoTexture);

        this.app.stage.addChild(this.videoSprite);
    }

    // Starts setting up the preview
    beginDraw(canvas) {
        // First setup PIXI
        this.app =  new PIXI.Application({
            view: canvas,
            autoResize: true,
            resolution: window.devicePixelRatio
        });

        // Add video to the scene
        this.addVideo();
        this.resize();

        // Add resize handler
        window.addEventListener('resize', () => {this.resize()});

        // For each text in the VideoData, create a TextSprite
        let videoTexts = [];
        const { text } = VideoData;
        text.forEach((e) => {
            videoTexts.push(this.addText(e));
        });

        // Build the timeline for when text should appear
        this.timeline = this.buildTimeline(videoTexts);
        this.syncTimeline();
    }

    buildTimeline(videoTexts) {
        let tl = new TimelineMax()

        // Animate each text content
        videoTexts.forEach(({container, mask}, index) => {
            console.log(container);

            // Set initial keyframe for the text
            tl.set(container, {pixi:{alpha:0}}, 'start' + index.toString())
                .set(mask, {pixi:{x:container.position.x - mask.width }}, 'start' + index.toString())

                // Transition the text in
                .to(container, .25, {pixi:{alpha:1}}, 'enter' + index.toString())
                .to(mask, .25, {pixi:{x:container.position.x}}, 'start' + index.toString())
                .to({}, 1.5, {}) // Let the text stay in place for a bit

                // Transition the text out
                .to(container, .25, {pixi:{alpha:0}}, 'exit' + index.toString())
                .to(mask, .25, {pixi:{x:container.position.x + mask.width }}, 'exit' + index.toString())
        });

        return tl;
    }

    syncTimeline() {
        // Sync the timeline to the video that is playing
        TweenMax.ticker.addEventListener(
            'tick', () => {
                const progress = this.video.currentTime/(VideoData.duration / 1000);
                this.timeline.progress(progress);
            }
        );

        // Reset the video at the specified duration from the data
        this.video.ontimeupdate = () => {
            if (this.video.currentTime >= VideoData.duration / 1000) {
                this.video.currentTime = 0;
                this.timeline.progress(0);
            }
        };
    }

    render() {
        return (
            <div className="lefts-border-line manufacturer-panel">
                <h1 className="manufacturer-title">
                    Video Preview
                </h1>
                <hr/>
                <div className="video-container">
                    <div className="aspect-ratio-fixer">
                        <div className="use-aspect-ratio">
                            <canvas ref="canvas" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default VideoPreview;
