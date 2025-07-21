document.addEventListener('DOMContentLoaded', function() {
    // Сразу скрываем модальное окно при загрузке
    const refreshModal = document.getElementById('refresh-modal');
    if (refreshModal) {
        refreshModal.style.display = 'none';
    }
    
    const refreshButton = document.getElementById('refresh-button');
    const loadingText = document.querySelector('.loading-text');
    const resultText = document.querySelector('.result-text');
    
    const requestTimeout = 30000;
    
    if (refreshButton) {
        refreshButton.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Показываем модальное окно
            refreshModal.style.display = 'flex';
            loadingText.style.display = 'block';
            resultText.style.display = 'none';
            
            // Создаем таймер для отмены запроса
            const timeoutId = setTimeout(() => {
                loadingText.style.display = 'none';
                resultText.style.display = 'block';
                resultText.textContent = 'Превышено время ожидания ответа сервера';
                setTimeout(() => {
                    refreshModal.style.display = 'none';
                }, 5000);
            }, requestTimeout);
            
            // Отправляем запрос на обновление
            fetch('/refresh', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            })
            .then(response => {
                clearTimeout(timeoutId);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                // Обновляем текст результата
                loadingText.style.display = 'none';
                resultText.style.display = 'block';
                resultText.textContent = data.message;
                
                // Если есть изменения, перезагружаем страницу через 1 секунду
                if (data.changes_count > 0) {
                    resultText.textContent += '. Страница будет обновлена...';
                    
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                } 
                // Если изменений нет, скрываем модальное окно через 3 секунды
                else {
                    resultText.textContent += '.';
                    setTimeout(() => {
                        refreshModal.style.display = 'none';
                    }, 3000);
                    // перезагружаем страницу, на случай удаления одного из сайтов
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                }
            })
            .catch(error => {
                clearTimeout(timeoutId);
                console.error('Error:', error);
                loadingText.style.display = 'none';
                resultText.style.display = 'block';
                resultText.textContent = 'Ошибка при обновлении: ' + error.message;
                setTimeout(() => {
                    refreshModal.style.display = 'none';
                }, 5000);
            });
        });
    }
});

//     // Плавная прокрутка
//     document.querySelectorAll('a[href^="#"]').forEach(anchor => {
//         anchor.addEventListener('click', function(e) {
//             e.preventDefault();
//             document.querySelector(this.getAttribute('href')).scrollIntoView({
//                 behavior: 'smooth'
//             });
//         });
//     });

//     // Ленивая загрузка изображений
//     const lazyImages = document.querySelectorAll('.site-preview');

//     if ('IntersectionObserver' in window) {
//         const imageObserver = new IntersectionObserver((entries, observer) => {
//             entries.forEach(entry => {
//                 if (entry.isIntersecting) {
//                     const img = entry.target;
//                     img.src = img.dataset.src;
//                     img.classList.add('loaded');
//                     imageObserver.unobserve(img);
//                 }
//             });
//         });

//         lazyImages.forEach(img => {
//             img.dataset.src = img.src;
//             img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"></svg>';
//             imageObserver.observe(img);
//         });
//     }

//     // Анимация при скролле
//     const animateOnScroll = () => {
//         const elements = document.querySelectorAll('.site-card');
//         elements.forEach(element => {
//             const position = element.getBoundingClientRect().top;
//             const screenPosition = window.innerHeight / 1.3;

//             if (position < screenPosition) {
//                 element.style.opacity = '1';
//                 element.style.transform = 'translateY(0)';
//             }
//         });
//     };

//     window.addEventListener('scroll', animateOnScroll);
//     animateOnScroll(); // Инициализация

//     // Автоматическое скрытие уведомления
//     const notification = document.getElementById('refresh-notification');
//     if (notification) {
//         // Автоматическое скрытие через 5 секунд
//         setTimeout(() => {
//             notification.classList.add('hide');

//             // Удаление из DOM после завершения анимации
//             setTimeout(() => {
//                 notification.remove();
//             }, 500); // Должно совпадать с длительностью перехода
//         }, 5000);

//         // Закрытие по клику на кнопку
//         const closeBtn = notification.querySelector('.close-btn');
//         if (closeBtn) {
//             closeBtn.addEventListener('click', function() {
//                 notification.classList.add('hide');
//                 setTimeout(() => {
//                     notification.remove();
//                 }, 500);
//             });
//         }
//     }
// });