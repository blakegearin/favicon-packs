console.log('Content running');

// document.body.style.border = "5px solid red";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // console.log(`request`);
  // console.dir(request, { depth: null });

  if (request.action === "setFavicon") {
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    link.href = `data:image/svg+xml;charset=utf-8,${request.svg}`;
    link.id = 'favicon-packs-favicon';
    document.head.appendChild(link);
  }
});

// Optionally, you can send a message to the background script to trigger the favicon replacement
chrome.runtime.sendMessage({ action: "replaceFavicon" });
