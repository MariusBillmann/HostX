document.addEventListener("DOMContentLoaded", function() {
    const manifest = chrome.runtime.getManifest();
    document.getElementById("app_name").textContent = manifest.name;
    document.getElementById("app_version").textContent = "Version: " + manifest.version;
    document.getElementById("app_author").textContent = "Author: " + manifest.author;

    let excelData = [];
    let searchTerm = "";

    function loadExcelFile() {
        fetch(chrome.runtime.getURL("data.xlsx"))
            .then(response => response.arrayBuffer())
            .then(data => {
                const workbook = XLSX.read(new Uint8Array(data), { type: "array" });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                excelData = XLSX.utils.sheet_to_json(worksheet);
                console.log("Loaded excel file:", excelData);
                
                chrome.runtime.sendMessage({ action: 'getSelectedText' }, response => {
                    if (response && response.text) {
                        searchTerm = response.text;
                        document.getElementById("searchInput").value = searchTerm;
                        searchForText(searchTerm);
                    }
                });
            })
            .catch(error => {
                console.log("Error while loading file!");
                const resultsDiv = document.getElementById("results");
                resultsDiv.innerHTML = ""; // Clear any results
                resultsDiv.classList.add("error-state");
                const p = document.createElement("p");
                p.textContent = "Couldn't find 'data.xlsx'";
                p.style.color = "var(--fail)";
                p.style.backgroundColor = "rgba(240, 30, 30, 0.1)";
                resultsDiv.appendChild(p);
            });
    }

    document.getElementById("settingsToggle").addEventListener("click", function () {
        toggleSettings()
    });

    function toggleSettings() {
        const settings = document.getElementById("settings");
        const results = document.getElementById("results");
        if(settings.style.display === "block") {
            settings.style.display = "none";
            results.style.display = "flex";
        } else {
            settings.style.display = "block";
            results.style.display = "none";
        }
    }

    function toggleTheme() {
        chrome.storage.local.get(["theme"], function (result) {
            const newTheme = result.theme === "dark" ? "light" : "dark";
            chrome.storage.local.set({ theme: newTheme }, function () {
                applyTheme(newTheme);
            });
        });
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute("data-theme", theme);
        document.getElementById("lightTheme").checked = (theme === "light");
        document.getElementById("darkTheme").checked = (theme === "dark");
    }

    chrome.storage.local.get(["theme"], function (result) {
        const currentTheme = result.theme || "dark";
        applyTheme(currentTheme);
    });

    document.querySelectorAll('input[name="theme"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const newTheme = this.value;
            chrome.storage.local.set({ theme: newTheme }, function() {
                applyTheme(newTheme);
            });
        });
    });

    function toggleThemeColor() {
        const newThemeColor = document.getElementById("newThemeColor").value;

        const isValidHex = /^#?([0-9A-F]{3}){1,2}$/i.test(newThemeColor);
        
        if (!isValidHex) {
            const msg = document.getElementById("theme-color-control-msg");
            msg.textContent = "Please enter a valid HEX color (e.g. #FF0000 or #F00)";
            msg.style.color = "var(--fail)";
            return;
        }

        const formattedColor = newThemeColor.startsWith('#') ? newThemeColor : '#' + newThemeColor;
        
        chrome.storage.local.set({ themecolor: formattedColor }, function() {
            applyThemeColor(formattedColor);
        });
    }

    function applyThemeColor(themecolor) {
        document.documentElement.style.setProperty('--themecolor', themecolor);
    }

    chrome.storage.local.get(["themecolor"], function(result) {
        const savedColor = result.themecolor || '#FB9943';
        applyThemeColor(savedColor);
    });

    document.getElementById("themeColorToggle").addEventListener("click", toggleThemeColor);

    loadExcelFile();

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.text) {
            searchTerm = message.text;
            document.getElementById("searchInput").value = searchTerm;
            searchForText(searchTerm);
        }
    });

    document.getElementById("searchBtn").addEventListener("click", function () {
        searchTerm = document.getElementById("searchInput").value.toLowerCase();
        if (searchTerm) {
            searchForText(searchTerm);
            document.getElementById("settings").style.display = "none";
            document.getElementById("results").style.display = "flex";
        } else {
            const resultsDiv = document.getElementById("results");
            resultsDiv.innerHTML = "";
        }
    });

    document.getElementById("searchInput").addEventListener("keydown", function (e) {
        if (e.code === "Enter") {
            searchTerm = document.getElementById("searchInput").value.toLowerCase();
            if (searchTerm) {
                searchForText(searchTerm);
                document.getElementById("settings").style.display = "none";
                document.getElementById("results").style.display = "flex";
            } else {
                const resultsDiv = document.getElementById("results");
                resultsDiv.innerHTML = "";
            }
        }
    });

    document.getElementById("searchInput").addEventListener("input", function () {
        searchTerm = document.getElementById("searchInput").value.toLowerCase();
        const searchBtn = document.getElementById("searchBtn");
        if (searchTerm) {
            searchBtn.style.color = "var(--themecolor)";
        } else {
            searchBtn.style.color = "var(--fontSecondary)";
        }
    });

    document.getElementById("clearBtn").addEventListener("click", function () {
        searchTerm = "";
        document.getElementById("searchInput").value = "";
        document.getElementById("results").innerHTML = "";
        const searchBtn = document.getElementById("searchBtn");
        searchBtn.style.color = "var(--fontSecondary)";
    });

    document.getElementById("resetSettings").addEventListener("click", function () {
        chrome.storage.local.clear();
        applyTheme("dark");
        applyThemeColor("#FB9943");
        document.getElementById("newThemeColor").value = "";
        document.getElementById("theme-color-control-msg").textContent = "";
    });

    function searchForText(searchTerm) {
        console.log("Search for:", searchTerm);
        console.log("Excel-file:", excelData);
        
        const resultsDiv = document.getElementById("results");
        resultsDiv.innerHTML = "";
        resultsDiv.classList.remove("error-state");

        searchTerm = searchTerm.toLowerCase().trim();

        const results = excelData.filter(row => {
            return Object.values(row).some(value => {
                const strValue = String(value).toLowerCase().trim();
                const found = strValue.includes(searchTerm);
                console.log(`Check '${strValue}' with '${searchTerm}': ${found}`);
                return found;
            });
        });

        console.log("Found results:", results);

        if (results.length === 0) {
            resultsDiv.classList.add("error-state");
            resultsDiv.innerHTML = "<p style='color: var(--fail); background-color: rgba(240, 30, 30, 0.1);'>No results found.</p>";
            return;
        }

        results.forEach(row => {
            const table = document.createElement("table");
            table.style.width = "100%";
            table.style.borderCollapse = "collapse";

            Object.entries(row).forEach(([key, value]) => {
                const tr = document.createElement("tr");

                const th = document.createElement("th");
                th.textContent = key;
                th.style.textAlign = "left";

                const td = document.createElement("td");

                const p = document.createElement("p");
                if(value == "") {
                    value = "missing";
                    p.style.color = "var(--fail)";
                    p.style.backgroundColor = "rgba(240, 30, 30, 0.1)";
                }
                p.textContent = value;

                tr.appendChild(th);
                tr.appendChild(td);
                td.appendChild(p);
                table.appendChild(tr);
            });

            resultsDiv.appendChild(table);
            resultsDiv.appendChild(document.createElement("hr"));
        });
    }
});
