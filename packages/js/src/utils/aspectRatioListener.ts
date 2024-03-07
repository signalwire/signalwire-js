const VIDEO_SIZING_EVENTS = ['loadedmetadata', 'resize']

export function aspectRatioListener({videoElement, paddingWrapper, fixInLandscapeOrientation = false, debugDivElementId = 'videoDimensionsDebug', samplingInterval = 0}: {videoElement: HTMLVideoElement, paddingWrapper: HTMLDivElement, fixInLandscapeOrientation: boolean, debugDivElementId?: string, samplingInterval?: number}) {
    const buildHtmlContent = (event:string, width: number, height: number) => `Video dimensions on <strong>${event} event</strong>:</strong> ${width}x${height}px - fixInLandscapeOrientation: ${fixInLandscapeOrientation}`
    const appendDebugInfo = (containerElement: HTMLElement, event:string) => {
        const pEl = document.createElement('p')
        pEl.innerHTML = buildHtmlContent(event, videoElement.videoWidth, videoElement.videoHeight);    
        containerElement.appendChild(pEl);
    }

    let debugElement: HTMLElement|null;
    try {
        debugElement = document.getElementById(debugDivElementId);
    } catch {}
    
    VIDEO_SIZING_EVENTS.forEach(event => videoElement.addEventListener(event, () => {
            const paddingBottom = fixInLandscapeOrientation ? '56.25' : 
                (videoElement.videoHeight / videoElement.videoWidth) * 100
            paddingWrapper.style.paddingBottom = `${paddingBottom}%`
            if(debugElement) {
                appendDebugInfo(debugElement, event)
            }
        }));

        if(samplingInterval > 0) {
            setInterval(() => {
                const paddingBottom = (videoElement.videoHeight / videoElement.videoWidth) * 100
                paddingWrapper.style.paddingBottom = `${paddingBottom}%`
                if(debugElement) {
                    let statsElement = debugElement.querySelector('.timer-values')
                    if(!statsElement) {
                        statsElement = document.createElement('div');
                        statsElement.className = 'timer-values'
                        debugElement.appendChild(statsElement);
                    }
                    appendDebugInfo(debugElement, 'timer')
                }
            });            
        }   
}