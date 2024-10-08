const words = ["Loading..","Loading...","Loading....","Loading....."];
let wordIndex = 0;
let charIndex = 0;
let isDeleting = false;
const preloaderdynamicText = document.querySelector("span#preloader");
function Load() {
  window.scrollTo(0, 0);
  $( ".Preloader" ).show("scale",{direction: "up"},750)
  $( "html" ).css('overflow', 'hidden');
  setTimeout(removeLoader, 2500); //wait for page load PLUS two seconds.
}
function sendform() {
  
}

function removeLoader(){
    $( ".Preloader" ).fadeOut(500, function() {
      // fadeOut complete. Remove the loading div
      $( ".Preloader" ).addClass("Hidden"); //makes page more lightweight 
      $( ".Preloader" ).remove()
      $( "header" ).css('display', 'flex');
      window.scrollTo(0, 0);
      $( "html" ).css('overflow', 'hidden');
      $( "html" ).css('overflow-x', 'hidden');
  }); 
}
const typeEffect1 = () => {
    const currentWord = words[wordIndex];
    const currentChar = currentWord.substring(0, charIndex);
        preloaderdynamicText.textContent = currentChar;
        preloaderdynamicText.classList.add("stop-blinking");

    if (!isDeleting && charIndex < currentWord.length) {
        // If condition is true, type the next character
        charIndex++;
        setTimeout(typeEffect1, 200);
    } else if (isDeleting && charIndex > 0) {
        // If condition is true, remove the previous character
        charIndex--;
        setTimeout(typeEffect1, 150);
    } else {
        // If word is deleted then switch to the next word
        isDeleting = !isDeleting;
          preloaderdynamicText.classList.remove("stop-blinking");
        wordIndex = !isDeleting ? (wordIndex + 1) % words.length : wordIndex;
        setTimeout(typeEffect1, 1200);
    }
}
typeEffect1();
