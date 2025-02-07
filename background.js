let selectedText = '';

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "searchText",
        title: "Lookup with SearchX",
        contexts: ["selection"]
    });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'setSelectedText') {
        selectedText = message.text;
    }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "searchText") {
        selectedText = info.selectionText;
        chrome.action.openPopup();
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getSelectedText') {
        sendResponse({ text: selectedText });
        selectedText = '';
    }
});
