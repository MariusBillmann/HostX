document.addEventListener('mouseup', function() {
    const selectedText = window.getSelection().toString().trim();
    if (selectedText) {
        if (window.location.hostname === "*") {
            chrome.runtime.sendMessage({ action: 'setSelectedText', text: selectedText });
        }
    }
});
