// This function will be injected into the active page to find video sources.
function findVideoSources() {
    const videos = document.querySelectorAll('video');
    const sources = [];
    videos.forEach((video, index) => {
        // Prefer the 'src' attribute if it exists and is a direct link
        if (video.src && !video.src.startsWith('blob:')) {
            sources.push({
                url: video.src,
                name: `Video ${index + 1}` // Simple naming convention
            });
            return; // Move to the next video element
        }
        // Otherwise, look for <source> elements inside the <video> tag
        const sourceTags = video.querySelectorAll('source');
        sourceTags.forEach(source => {
            if (source.src && !source.src.startsWith('blob:')) {
                sources.push({
                    url: source.src,
                    name: `Video ${index + 1} (Source)`
                });
            }
        });
    });
    return sources;
}

// Function to create a list item for each found video
function createVideoListItem(videoInfo, index) {
    const listItem = document.createElement('li');

    const nameSpan = document.createElement('span');
    nameSpan.className = 'video-name';
    // Extract filename from URL for better display
    try {
        const url = new URL(videoInfo.url);
        const path = url.pathname.split('/').pop();
        nameSpan.textContent = path || videoInfo.name;
        nameSpan.title = videoInfo.url;
    } catch (e) {
        nameSpan.textContent = videoInfo.name;
        nameSpan.title = videoInfo.url;
    }
    listItem.appendChild(nameSpan);

    const downloadButton = document.createElement('button');
    downloadButton.textContent = 'Download';
    downloadButton.className = 'download-btn';
    downloadButton.addEventListener('click', () => {
        console.log('Downloading:', videoInfo.url);
        // Use the chrome.downloads API to download the file
        chrome.downloads.download({
            url: videoInfo.url,
            // Suggest a filename, browser may override
            filename: (nameSpan.textContent.includes('.') ? nameSpan.textContent : nameSpan.textContent + '.mp4').replace(/[<>:"/\\|?*]/g, '_')
        });
        const status = document.getElementById('status');
        status.textContent = 'Download started!';
        setTimeout(() => window.close(), 500); // Close popup after starting
    });
    listItem.appendChild(downloadButton);

    return listItem;
}

// Main logic that runs when the popup is opened
document.addEventListener('DOMContentLoaded', async () => {
    const videoList = document.getElementById('video-list');
    const status = document.getElementById('status');

    // Get the current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab) {
        // Execute the script in the context of the active tab
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id, allFrames: true }, // Check all iframes
            function: findVideoSources
        });

        // The result is an array of injection results. We need to process them.
        const allSources = results.flatMap(frameResult => frameResult.result || []);
        
        // Remove duplicate URLs
        const uniqueSources = Array.from(new Map(allSources.map(item => [item.url, item])).values());


        if (uniqueSources && uniqueSources.length > 0) {
            status.textContent = `Found ${uniqueSources.length} video(s).`;
            uniqueSources.forEach((videoInfo, index) => {
                const listItem = createVideoListItem(videoInfo, index);
                videoList.appendChild(listItem);
            });
        } else {
            status.textContent = 'No downloadable videos found on this page.';
        }
    } else {
        status.textContent = 'Could not access the current tab.';
    }
});
