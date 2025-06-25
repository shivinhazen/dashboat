// Verificar se AOS existe antes de inicializar
if (typeof AOS !== 'undefined') {
  AOS.init({
    duration: 800,
    easing: 'slide',
    once: true,
  });
}

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const loader = document.querySelector('.loader');
  if (loader) {
    setTimeout(() => {
      loader.style.display = 'none';
    }, 200);
  }

  const overlayer = document.querySelector('#overlayer');
  if (overlayer) {
    setTimeout(() => {
      overlayer.style.display = 'none';
    }, 200);
  }

  const siteMenuClone = function () {
    $('.js-clone-nav').each(function () {
      const $this = $(this);
      $this
        .clone()
        .attr('class', 'site-nav-wrap')
        .appendTo('.site-mobile-menu-body');
    });

    setTimeout(function () {
      let counter = 0;
      $('.site-mobile-menu .has-children').each(function () {
        const $this = $(this);

        $this.prepend('<span class="arrow-collapse collapsed">');

        $this.find('.arrow-collapse').attr({
          'data-toggle': 'collapse',
          'data-target': '#collapseItem' + counter,
        });

        $this.find('> ul').attr({
          class: 'collapse',
          id: 'collapseItem' + counter,
        });

        counter++;
      });
    }, 1000);

    $('body').on('click', '.arrow-collapse', function (e) {
      const $this = $(this);
      if ($this.closest('li').find('.collapse').hasClass('show')) {
        $this.removeClass('active');
      } else {
        $this.addClass('active');
      }
      e.preventDefault();
    });

    $(window).resize(function () {
      const $this = $(this),
        w = $this.width();

      if (w > 768) {
        if ($('body').hasClass('offcanvas-menu')) {
          $('body').removeClass('offcanvas-menu');
        }
      }
    });

    $('body').on('click', '.js-menu-toggle', function (e) {
      const $this = $(this);
      e.preventDefault();

      if ($('body').hasClass('offcanvas-menu')) {
        $('body').removeClass('offcanvas-menu');
        $('body').find('.js-menu-toggle').removeClass('active');
      } else {
        $('body').addClass('offcanvas-menu');
        $('body').find('.js-menu-toggle').addClass('active');
      }
    });

    // click outisde offcanvas
    $(document).mouseup(function (e) {
      const container = $('.site-mobile-menu');
      if (!container.is(e.target) && container.has(e.target).length === 0) {
        if ($('body').hasClass('offcanvas-menu')) {
          $('body').removeClass('offcanvas-menu');
          $('body').find('.js-menu-toggle').removeClass('active');
        }
      }
    });
  };
  siteMenuClone();

  const owlPlugin = function () {
    if ($('.owl-3-slider').length > 0) {
      const owl3 = $('.owl-3-slider').owlCarousel({
        loop: true,
        autoHeight: true,
        margin: 10,
        autoplay: true,
        autoplayTimeout: 4000,
        autoplayHoverPause: true,
        smartSpeed: 600,
        items: 3,
        nav: true,
        dots: true,
        lazyLoad: false,
        navText: [
          '<span class="icon-keyboard_backspace"></span>',
          '<span class="icon-keyboard_backspace"></span>',
        ],
        responsive: {
          0: {
            items: 1,
          },
          600: {
            items: 2,
          },
          800: {
            items: 2,
          },
          1000: {
            items: 3,
          },
          1100: {
            items: 3,
          },
        },
      });
    }
    if ($('.owl-4-slider').length > 0) {
      const owl4 = $('.owl-4-slider').owlCarousel({
        loop: true,
        autoHeight: true,
        margin: 10,
        autoplay: true,
        autoplayTimeout: 4000,
        autoplayHoverPause: true,
        smartSpeed: 700,
        items: 4,
        nav: true,
        dots: true,
        lazyLoad: false,
        navText: [
          '<span class="icon-keyboard_backspace"></span>',
          '<span class="icon-keyboard_backspace"></span>',
        ],
        responsive: {
          0: {
            items: 1,
          },
          600: {
            items: 2,
          },
          800: {
            items: 2,
          },
          1000: {
            items: 3,
          },
          1100: {
            items: 4,
          },
        },
      });

      $('.js-custom-next-v2').click(function (e) {
        e.preventDefault();
        owl4.trigger('next.owl.carousel');
      });
      $('.js-custom-prev-v2').click(function (e) {
        e.preventDefault();
        owl4.trigger('prev.owl.carousel');
      });
    }

    if ($('.owl-single-text').length > 0) {
      let owlText;
      owlText = $('.owl-single-text').owlCarousel({
        loop: true,
        autoHeight: true,
        margin: 0,
        autoplay: true,
        autoplayTimeout: 6000,
        autoplayHoverPause: true,
        smartSpeed: 1200,
        items: 1,
        nav: false,
        navText: [
          '<span class="icon-keyboard_backspace"></span>',
          '<span class="icon-keyboard_backspace"></span>',
        ],
      });
    }
    if ($('.owl-single').length > 0) {
      const owl = $('.owl-single').owlCarousel({
        loop: true,
        autoHeight: true,
        margin: 0,
        autoplay: true,
        autoplayTimeout: 5000,
        autoplayHoverPause: true,
        smartSpeed: 800,
        items: 1,
        nav: false,
        lazyLoad: false,
        navText: [
          '<span class="icon-keyboard_backspace"></span>',
          '<span class="icon-keyboard_backspace"></span>',
        ],
        onInitialized: counter,
      });

      $('.js-custom-owl-next').click(function (e) {
        e.preventDefault();
        owl.trigger('next.owl.carousel');
      });
      $('.js-custom-owl-prev').click(function (e) {
        e.preventDefault();
        owl.trigger('prev.owl.carousel');
      });

      $('.owl-dots .owl-dot').each(function (i) {
        $(this).attr('data-index', i - 3);
      });

      owl.on('changed.owl.carousel', function (event) {
        let i = event.item.index;
        if (i === 1) {
          i = event.item.count;
        } else {
          i = i - 1;
        }
        $('.owl-current').text(i);
        $('.owl-total').text(event.item.count);
      });
    }
  };
  owlPlugin();

  const counter = function (event) {
    $('.owl-total').text(event.item.count);
  };

  // Scroll suave para âncoras (ajustado para rolar até o topo e animar a caixa de reserva)
  document.querySelectorAll('a[href="#reserva"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const target = document.getElementById('reserva');
      if (target) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        const form = document.getElementById('reservationForm');
        if (form) {
          const campos = form.querySelectorAll(
            'input.form-control, textarea.form-control, select.form-control, select.custom-select'
          );
          campos.forEach(campo => campo.classList.add('pulse-campo'));
          setTimeout(
            () =>
              campos.forEach(campo => campo.classList.remove('pulse-campo')),
            1700
          );
        }
      }
    });
  });

  // Scroll suave e efeito pulse nos campos do formulário de contato (todos juntos)
  document.querySelectorAll('a[href="#contato"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const form = document.getElementById('contato');
      if (form) {
        e.preventDefault();
        const formRect = form.getBoundingClientRect();
        const scrollTop =
          window.pageYOffset || document.documentElement.scrollTop;
        const formMiddle =
          formRect.top +
          scrollTop -
          window.innerHeight / 2 +
          formRect.height / 2;
        window.scrollTo({ top: formMiddle, behavior: 'smooth' });
        // Efeito pulse em todos os campos ao mesmo tempo
        const campos = form.querySelectorAll(
          'input.form-control, textarea.form-control'
        );
        campos.forEach(campo => campo.classList.add('pulse-campo'));
        setTimeout(
          () => campos.forEach(campo => campo.classList.remove('pulse-campo')),
          1700
        );
      }
    });
  });

  // Se a página for carregada com #reserva na URL, scrolla para o topo e ativa o efeito pulse
  if (window.location.hash === '#reserva') {
    setTimeout(function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const form = document.getElementById('reservationForm');
      if (form) {
        const campos = form.querySelectorAll(
          'input.form-control, textarea.form-control, select.form-control, select.custom-select'
        );
        campos.forEach(campo => campo.classList.add('pulse-campo'));
        setTimeout(
          () => campos.forEach(campo => campo.classList.remove('pulse-campo')),
          1700
        );
      }
    }, 200); // pequeno delay para garantir que o DOM está pronto
  }
});
