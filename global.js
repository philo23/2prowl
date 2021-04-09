(function (window, $, safariext, safariapp, console) {
	// API Key Configuration
	var website = "https://prowlapp.com/",
	    apipage = website + "api_settings.php",
	    api = website + "publicapi/",
	    apikey = $.Settings.getItem('ProwlAPIKey'),
	    verified = !!$.Settings.getItem('ProwlAPIKeyVerified'),
	    fetching = false,
	    errors = { // API Error Response Codes
			400: "Prowl API responded with an error.",
			401: "Your Prowl API Key is invalid.",
			405: "SSL connection to the Prowl API required.",
			406: "You've exceeded your send limit.",
			500: "The Prowl API is down."
		};
	
	function resetButton (button) {
		if (button.stopAnimation) { button.stopAnimation(); }
		button.disabled = false;
		button.image = $.Base + "send.png";
		button.toolTip = "Send URL via 2Prowl";
		button.error = null;
	}
	
	
	function APIKey (success, requestLogin, unable) {
		var req = new $.Request({
			url:		apipage,
			format:		'html'
		});
		
		req.on('success', function (html) {
			var code = html.getElementsByTagName('code')[0];
			if (code && code.innerText.trim().length === 40) {
				success(code.innerText.trim());
			}
			else {
				if ($('#login a[href$="login.php"]', html).length === 1) { requestLogin(); }
				else { unable(); }
			}
		});
		req.on('error', function () { unable(); });
		
		req.send();
	}
	
	function APIVerify (key, success, fail, error) {
		var req = new $.Request({
			url:		api + 'verify',
			format:		'xml',
			data:		{ "apikey": key },
			isSuccess:	function (status) { return status === 200; }
		});
		
		req.on('success', function () { success(key); });
		req.on('error', function (status) {
			if (status === 401) { fail(key); }
			else { error(status, key); }
		});
		
		req.send();
	}
	
	function APIPush (url, success, error) {
		console.log('API Key: %s', apikey);
		var req = new $.Request({
			url:		api + 'add',
			method:		'post',
			format:		'xml',
			data:		{ 'apikey': apikey, 'application': '2Prowl', 'event': 'Website', 'description': url, 'url': url },
			isSuccess:	function (status) { return status === 200; }
		});
		
		req.on('success', function () { success(url); });
		req.on('error', function (status) { error(status, url); });
		
		req.send();
	}
	
	function requestLogin () {
		console.log('No log in, requesting login...');
		var r = window.confirm([
			"To begin using 2Prowl, please login to:",
			apipage,
			"And try using 2Prowl again.",
			"Go there now?"
		].join("\n"));
		if (r !== false) { $.newTab(apipage); }
	}
	function unableToFetchKey () {
		console.warn('Unable to fetch API key.');
		var r = window.confirm([
			"2Prowl was unable to automatically find your Prowl API key. Please login to:",
			apipage,
			"And manually copy and paste your API key into the extension settings window.",
			"Go there now?"
		].join("\n"));
		if (r !== false) { $.newTab(apipage); }
	}
	function error (code) {
		window.alert("Unable to send webpage, \n" + errors[code]);
	}
	
	
	function pushPage (button, url) {
		APIPush(
			url,
			function (url) {
				if (button.stopAnimation) { button.stopAnimation(); }
				
				console.log("Push successful");
				button.disabled = true;
				button.image = $.Base + "done.png";
				button.toolTip = "Sent!";
				button.timeout = setTimeout(function () { resetButton(button); }, 1600);
				
				if (!!$.Settings.getItem('ProwlOverlay')) { button.relatedTab.page.dispatchMessage("successPushing", ""); }
			},
			function (code) {
				if (button.stopAnimation) { button.stopAnimation(); }
				
				console.warn("Push unsuccessful: \n" + errors[code]);
				button.disabled = false;
				button.image = $.Base + "error.png";
				button.toolTip = "Unable to send. Click to find out why.";
				button.error = code;
				
				if (!!$.Settings.getItem('ProwlOverlay')) { button.relatedTab.page.dispatchMessage("errorPushing", ""); }
			}
		);
	}
	
	/**
	* Handle the button being pressed
	**/
	function onSendPage (button) {
		// Fetch the current tabs URL (internal safari pages are ignored, eg: topsites)
		var tab = safariapp.activeBrowserWindow.activeTab, url = tab.url, message = "Unknown error.";
		if (url === undefined) { return; }
		
		// Clear any timeouts
		if (button.timeout) { clearTimeout(button.timeout); }
		// Show any error messages
		if (button.error) {
			if (errors[button.error]) { message = errors[button.error]; }
			window.alert("Unable to send webpage, " + message);
			resetButton(button);
			return;
		}
		
		// Stop the user from clicking again until its complete
		button.disabled = true;
		button.image = $.Base + "send.png";
		button.toolTip = "Sending...";
		button.relatedTab = tab;
		
		// Being the pulse animation
		$.animateButton(button, $.Base + 'pulse/', [ '1.png', '2.png', '3.png', '4.png' ]);
		if (!!$.Settings.getItem('ProwlOverlay')) { button.relatedTab.page.dispatchMessage("startPushing", ""); }
		
		// API Key is not verified, 
		if (verified === false) {
			APIKey(
				// Success
				function (key) {
					// Set all of the settings
					verified = true;
					apikey = key;
					$.Settings.setItem('ProwlAPIKeyVerified', true);
					$.Settings.setItem('ProwlAPIKey', key);
					// Go ahead and push the page now
					pushPage(button, url);
				},
				// Request Login
				function () {
					if (!!$.Settings.getItem('ProwlOverlay')) { tab.page.dispatchMessage("cancelPushing", ""); }
					// Stop the animation, and return button to default state
					resetButton(button);
					// Display message
					requestLogin();
				},
				// On errors
				function () {
					if (!!$.Settings.getItem('ProwlOverlay')) { tab.page.dispatchMessage("cancelPushing", ""); }
					// Stop the animation, and return button to default state
					resetButton(button);
					// Display message
					unableToFetchKey();
				}
			);
		}
		else {
			// Push the page
			pushPage(button, url);
		} 
	}
	
	function nullifyAPIKey () {
		apikey = "";
		verified = false;
		$.Settings.setItem('ProwlAPIKey', "");
		$.Settings.setItem('ProwlAPIKeyVerified', false);
	}
	function setAPIKey (key) {
		apikey = key;
		verified = true;
		$.Settings.setItem('ProwlAPIKey', key);
		$.Settings.setItem('ProwlAPIKeyVerified', true);
	}
	
	/**
	* Detect when the API Key is changed in the preferences screen
	**/
	function onAPIKeyChange (oldKey, newKey) {
		if (oldKey === newKey) { return; }
		// Do verify
		
		APIVerify(
			newKey,
			// On success
			function () {
				setAPIKey(newKey);
				console.log('Verification succeeded, key: %s', newKey);
			},
			// On fail
			function () {
				nullifyAPIKey();
				console.warn('Verification failed.');
			},
			// On error
			function (code) {
				nullifyAPIKey();
				console.error('API Error, %s', errors[code]);
			}
		);
	}
		
	$.Command.on('send-page', onSendPage);
	$.Settings.on('ProwlAPIKey', onAPIKeyChange);
	
}(window, Sapphire, safari.extension, safari.application, console));