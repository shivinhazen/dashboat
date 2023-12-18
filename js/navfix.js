var header = document.querySelector(".site-nav");
var slide = document.querySelector(".hero .slides");
var slideHeight = slide.offsetHeight;

window.addEventListener("scroll", function() {
  var scrollPos = window.scrollY;
  var windowHeight = window.innerHeight;

  if (scrollPos >= slideHeight - windowHeight) {
    header.classList.remove("transparent");
  } else {
    header.classList.add("transparent");
  }
});