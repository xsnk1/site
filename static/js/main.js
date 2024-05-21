$(document).ready(function() {


    $('#searchInput').on('keyup', function() {
        var value = $(this).val().toLowerCase();
        $("#listOfServices li").filter(function() {
            $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1)
        });
    });


    $('.backButton').click(function() {
        $('#loginForm').hide();
        $('#registerForm').hide();
        $('#showLoginForm').show();
        $('#showRegisterForm').show();
    });
        // Скрываем формы при инициализации
    $('#loginForm').hide();
    $('#registerForm').hide();

    // Обработка нажатия на кнопку "Войти"
    $('#showLoginForm').click(function() {
        $('#loginForm').show();
        $('#registerForm').hide();
        $('#showLoginForm').hide();
        $('#showRegisterForm').hide();
    });

    // Обработка нажатия на кнопку "Регистрация"
    $('#showRegisterForm').click(function() {
        $('#registerForm').show();
        $('#loginForm').hide();
        $('#showLoginForm').hide();
        $('#showRegisterForm').hide();
    });

    // Объявление функции loadServices в глобальной области видимости внутри ready
    function loadServices() {
        $.ajax({
            url: '/services',
            type: 'GET',
            success: function(response) {
                var servicesList = $('#listOfServices');
                servicesList.empty();
                response.services.forEach(function(service) {
                    var serviceItem = $(`
                        <li>
                            <h3>${service.name}</h3>
                            <p>${service.description}</p>
                            <p>Телефон: ${service.phone}</p>
                            <p>Цена: $${service.price.toFixed(2)}</p>
                            ${response.current_user_id === service.user_id ? `<button class="delete-button" data-service-id="${service.id}">Удалить услугу</button>` : ''}
                        </li>
                    `);
                    servicesList.append(serviceItem);
                });
            },
            error: function() {
                alert('Ошибка загрузки услуг');
            }
        });
    }
    
    // Проверяем, авторизован ли пользователь
    function checkAuth() {
        $.get('/is-authenticated', function(data) {
            if (data.isAuthenticated) {
                $('#authContainer').hide();
                $('#servicesSection').show();
                $('#serviceForm').show();
                $('#servicesList').show();
                $('#logoutButton').show();
                loadServices();
            } else {
                $('#authContainer').show();
                $('#serviceForm').hide();
                $('#servicesList').hide();
                $('#servicesSection').hide();
                $('#logoutButton').hide();
            }
        });
    }
    function deleteService(serviceId) {
        $.ajax({
            url: '/delete-service/' + serviceId,
            type: 'POST',
            success: function(response) {
                alert('Услуга успешно удалена');
                loadServices(); // Перезагрузить список услуг после удаления
            },
            error: function(xhr) {
                alert('Ошибка удаления услуги ' + xhr.responseText);
            }
        });
    }

    // Назначаем обработчик клика на кнопки удаления
    $('body').on('click', '.delete-button', function() {
        var serviceId = $(this).data('service-id');
        deleteService(serviceId);
    });
    
    // Обработка входа
    $('#loginForm').submit(function(e) {
        e.preventDefault();
        var email = $('#loginEmail').val();
        var password = $('#loginPassword').val();
        $.ajax({
            url: '/login',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ email: email, password: password }),
            success: function(response) {
                alert('Вы успешно зашли в систему');
                checkAuth();
            },
            error: function() {
                alert('Почта или пароль неверный');
            }
        });
    });


    // Обработка выхода из аккаунта
    $('#logoutButton').click(function() {
        $.ajax({
            url: '/logout',
            type: 'POST',
            success: function(response) {
                alert('Вы вышли из аккаунта!');
                window.location.href = '/';
            },
            error: function() {
                alert('Ошибка выхода из аккаунта, попробуйте еще раз');
            }
        });
    });

    // Обработка добавления услуги
    $('#serviceForm').submit(function(e) {
        e.preventDefault();
        var data = {
            name: $('#serviceName').val(),
            description: $('#serviceDescription').val(),
            phone: $('#servicePhone').val(),
            price: $('#servicePrice').val()
        };
    
        $.ajax({
            url: '/add-service',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: function(response) {
                alert('Услуга успешно добавлена!');
                loadServices();
            },
            error: function() {
                alert('Ошибка добавления услуги, попробуйте еще раз');
            }
        });
    });
   // Обработка регистрации
   $('#registerForm').submit(function(e) {
    e.preventDefault();
    var username = $('#registerUsername').val();
    var email = $('#registerEmail').val();
    var password = $('#registerPassword').val();
    var confirmPassword = $('#registerConfirmPassword').val();
    if (password !== confirmPassword) {
        alert('Пароли не совпадают');
        return;
    }
    $.ajax({
        url: '/register',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ username: username, email: email, password: password }),
        success: function(response) {
            alert('Регистрация прошла успешно!');
            checkAuth();
        },
        error: function() {
            alert('Пользователь с такой почтой или именем уже существует');
        }
    });
});
    

    checkAuth();  // Вызываем при загрузке страницы
});
