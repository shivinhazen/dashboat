/**
 * Otimizador de Imagens - Dash Boat Tour
 * Verifica o suporte a WebP e carrega as imagens de forma otimizada.
 */
class ImageOptimizer {
  constructor() {
    this.init();
  }

  init() {
    document.addEventListener('DOMContentLoaded', () => {
      // Detectar imagens e background-images
      const images = document.querySelectorAll('img');
      const backgroundImages = document.querySelectorAll(
        '[style*="background-image"]'
      );

      // Verificar carregamento de imagens
      images.forEach(img => {
        if (!img.complete) {
          img.addEventListener('error', () => {
            // Lógica de fallback se necessário
          });
        }
      });

      // Função para verificar suporte a WebP
      const checkWebPSupport = () => {
        const webpImg = new Image();
        webpImg.onload = () => {
          const webpSupported = webpImg.height === 2;
          if (!webpSupported) {
            // Converter imagens WebP para JPG como fallback
            images.forEach(img => {
              if (img.src.includes('.webp')) {
                img.src = img.src.replace('.webp', '.jpg');
              }
            });
            backgroundImages.forEach(el => {
              if (el.style.backgroundImage.includes('.webp')) {
                el.style.backgroundImage = el.style.backgroundImage.replace(
                  '.webp',
                  '.jpg'
                );
              }
            });
          }
        };
        webpImg.onerror = () => {
          // Fallback para todas as imagens se o teste falhar
          images.forEach(img => {
            if (img.src.includes('.webp')) {
              img.src = img.src.replace('.webp', '.jpg');
            }
          });
          backgroundImages.forEach(el => {
            if (el.style.backgroundImage.includes('.webp')) {
              el.style.backgroundImage = el.style.backgroundImage.replace(
                '.webp',
                '.jpg'
              );
            }
          });
        };
        webpImg.src =
          'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
      };

      // Função para testar a imagem de contato
      const testContactImage = () => {
        const contactImage = document.querySelector('img[src*="contato"]');
        if (contactImage) {
          if (!contactImage.complete) {
            contactImage.addEventListener('error', () => {
              contactImage.src = contactImage.src.replace('.webp', '.jpg');
            });
          }
        }
      };

      checkWebPSupport();
      testContactImage();
    });
  }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  new ImageOptimizer();
});
