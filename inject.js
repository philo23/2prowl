if (window.top === window) {


var body, overlay, modal, image, message, aniTimeout = null, aniStep = 0, finishTimeout = null, baseURI = safari.extension.baseURI;

function applyStyles (elm, styles) {
	var prop;
	for (prop in styles) { if (styles.hasOwnProperty(prop)) { elm.style[prop] = styles[prop]; } }
}

function playAnimation () {
	if (aniTimeout) { clearTimeout(aniTimeout); }
	aniStep++;
	if (aniStep > 7) { aniStep = 0; }
	
	applyStyles(image, {
		backgroundImage: "url("+baseURI+"progress.png)",
		backgroundPosition: "-"+(aniStep * 70)+"px 0"
	});
	
	aniTimeout = setTimeout(playAnimation, 70);
}

function injectModal () {
	var radius = Math.max(window.innerWidth, window.innerHeight);
	
	body = document.getElementsByTagName('body')[0];
	overlay = document.createElement('div');
	modal = document.createElement('div');
	image = document.createElement('div');
	message = document.createElement('span');
		
	applyStyles(overlay, {
		zIndex: "9998",
		position: "fixed",
		top: "0px",
		right: "0px",
		bottom: "0px",
		left: "0px",
		backgroundImage: "-webkit-gradient(radial, center center, 10, center center, "+radius+", from(rgba(74, 74, 74, 0.1)), to(rgba(0, 0, 0, 0.8)))",
		backgroundRepeat: "no-repeat",
		backgroundSize: "100% 100%",
		opacity: 0,
		webkitTransition: "opacity 0.4s ease-in-out"
	});
	applyStyles(modal, {
		zIndex: "9999",
		position: "fixed",
		top: "50%",
		left: "50%",
		width: "160px",
		height: "160px",
		margin: "-80px 0 0 -80px",
		backgroundColor: "rgba(0, 0, 0, 0.6)",
		textAlign: "center",
		borderRadius: "12px",
		cursor: "default",
		webkitUserSelect: "none",
		webkitTransform: "scale(0)",
		webkitTransition: "-webkit-transform 0.3s ease-in-out, opacity 0.5s ease-in-out"
	});
	applyStyles(image, {
		width: "70px",
		height: "70px",
		lineHeight: "70px",
		margin: "40px auto 15px",
		backgroundImage: "url("+baseURI+"pulse/pos1.png)",
		backgroundRepeat: "no-repeat",
		backgroundPosition: "center center"
	});
	applyStyles(message, {
		fontFamily: "\"Helvetica Neue\", Helvetica, Arial, sans-serif",
		fontSize: "16px",
		fontWeight: 700,
		textShadow: "#000 0 1px 3px",
		color: "white"
	});
	
	
	
	modal.appendChild(image);
	modal.appendChild(message);
}
function removeModal () {
	modal.parentElement.removeChild(modal);
	overlay.parentElement.removeChild(overlay);
}

function startPushing () {
	injectModal();
	message.innerHTML = "Pushing...";
	
	body.appendChild(modal);
	body.appendChild(overlay);
	
	setTimeout(function () {
		applyStyles(modal, { webkitTransform: "scale(1.1)" });
		setTimeout(function () {
			applyStyles(modal, { webkitTransform: "scale(1)" });
		}, 300);
		applyStyles(overlay, { opacity: 1 });
	}, 50);
	
	playAnimation();
}
function successPushing () {
	if (finishTimeout) { clearTimeout(finishTimeout); }
	
	finishTimeout = setTimeout(function () {
		if (aniTimeout) { clearTimeout(aniTimeout); }
		
		applyStyles(image, { backgroundImage: "url("+baseURI+"finish.png)", backgroundPosition: "center center" });
		message.innerHTML = "Done";
		
		setTimeout(function () {
			applyStyles(modal, { opacity: 0 });
			applyStyles(overlay, { opacity: 0 });
			setTimeout(removeModal, 800);
		}, 900);
	}, 200);
}
function errorPushing () {
	if (finishTimeout) { clearTimeout(finishTimeout); }
	
	finishTimeout = setTimeout(function () {
		if (aniTimeout) { clearTimeout(aniTimeout); }
		
		applyStyles(image, { backgroundImage: "url("+baseURI+"error_modal.png)", backgroundPosition: "center center" });
		message.innerHTML = "Error";
		
		setTimeout(function () {
			applyStyles(modal, { opacity: 0 });
			applyStyles(overlay, { opacity: 0 });
			
			setTimeout(removeModal, 500);
		}, 1200);
		
	}, 200);
}
function cancelPushing () {
	if (aniTimeout) { clearTimeout(aniTimeout); }
	applyStyles(modal, { opacity: 0 });
	applyStyles(overlay, { opacity: 0 });
	
	setTimeout(removeModal, 500);
}






function handleMessage (event) {
	var name = event.name;
	
	if (name === "startPushing") { startPushing(); }
	if (name === "successPushing") { successPushing(); }
	if (name === "errorPushing") { errorPushing(); }
	if (name === "cancelPushing") { cancelPushing(); }
}

safari.self.addEventListener("message", handleMessage, false);


}