let SELECTED_OPTION = 0

function updateSelectedOption(option) {
    let selected_frame = "about"
    const maxLENGTH = document.getElementsByClassName("options-list")[0].children.length
    if(option >= maxLENGTH){
        option = 0
    } else if(option < 0){
        option = maxLENGTH - 1
    }
    var elements = document.getElementsByClassName("settings_frame");
    switch(option){
        case 0:
            selected_frame = "global-settings";
            break;
        case 1:
            selected_frame = "broadcast-settings";
            break;
        case 2:
            selected_frame = "audio-settings";
            break;
        case 3:
            selected_frame = "video-settings";
            break;
        case 4:
            selected_frame = "styles-settings";
            break;
        case 5:
            selected_frame = "advanced-settings";
            break;
        case 6:
            selected_frame = "about";
            break;
        default:
            selected_frame = "about";
            break;
    }
    Array.prototype.forEach.call(elements, function(elm) {
        if(elm.id == selected_frame){
            elm.removeAttribute("style")
        } else{
            elm.style.display = "none"
        }
    });
    
    document.getElementsByClassName("selected")[0].classList.remove("selected")
    SELECTED_OPTION = option
    document.getElementsByClassName("options-list")[0].children[SELECTED_OPTION].classList.add("selected")
}

// Add frames for options
var elements_option = document.getElementsByClassName("options-list");
Array.prototype.forEach.call(elements_option, function(elm) {
    elm.addEventListener("click", function(){
        updateSelectedOption(Array.prototype.indexOf.call(elm.children, event.target))
    });
});

window.updateSelectedOption = updateSelectedOption;