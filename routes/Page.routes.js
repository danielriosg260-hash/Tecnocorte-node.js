const express = require('express');
const router = express.Router();

// ── Públicas (páginas completas autocontenidas) ────────────────────────────
router.get('/', (req, res) => res.render('publicos/index', { layout: false, active: 'inicio' }));
router.get('/login', (req, res) => res.render('publicos/login', { layout: false }));
router.get('/registro', (req, res) => res.render('publicos/registro', { layout: false }));
router.get('/ayuda', (req, res) => res.render('publicos/ayuda', { layout: false }));

// ── Públicas con layout base ───────────────────────────────────────────────
router.get('/recuperar-password', (req, res) => res.render('publicos/recuperar_password', { layout: 'layouts/base', title: 'Recuperar contraseña' }));
router.get('/restablecer-password/:token', (req, res) => res.render('publicos/restablecer_password', { layout: 'layouts/base', title: 'Restablecer contraseña', token: req.params.token }));
router.get('/como-funciona', (req, res) => res.render('publicos/como_funciona', { layout: 'layouts/base', title: '¿Cómo funciona?' }));
router.get('/sobre-nosotros', (req, res) => res.render('publicos/sobre_nosotros', { layout: 'layouts/base', title: 'Sobre nosotros' }));

// ── Usuarios (cliente) ─────────────────────────────────────────────────────
router.get('/tienda', (req, res) => res.render('usuarios/usuario_tienda', { layout: false, active: 'tienda' }));
router.get('/servicios', (req, res) => res.render('usuarios/usuario_servicios', { layout: false, active: 'servicios' }));
router.get('/peluquerias', (req, res) => res.render('usuarios/usuario_peluquerias', { layout: false, active: 'barberias' }));
router.get('/reservar-cita', (req, res) => res.render('usuarios/usuario_reservar_cita', { layout: false }));
router.get('/pre-confirmar', (req, res) => res.render('usuarios/usuario_reservar_cita', { layout: false }));
router.get('/confirmar-reserva', (req, res) => res.render('usuarios/usuario_confirmar_reserva', { layout: false }));
router.get('/perfil', (req, res) => res.render('usuarios/usuario_perfil', { layout: false }));
router.get('/notificaciones', (req, res) => res.render('usuarios/usuario_notificaciones', { layout: false }));
router.get('/cambiar-password', (req, res) => res.render('usuarios/cambiar_password', { layout: 'layouts/dashboard', title: 'Cambiar contraseña' }));
router.get('/editar-reserva/:id', (req, res) => res.render('usuarios/usuario_editar_reserva', { layout: 'layouts/dashboard', title: 'Editar reserva', reserva_id: req.params.id }));
router.get('/confirmar-cita/:id', (req, res) => res.render('usuarios/usuario_confirmar_reserva', { layout: false, reserva_id: req.params.id }));
router.get('/calificar/:id', (req, res) => res.render('usuarios/usuario_confirmar_reserva', { layout: false, reserva_id: req.params.id }));

// ── Carrito ────────────────────────────────────────────────────────────────
router.get('/carrito', (req, res) => res.render('carrito/carrito', { layout: false, active: 'carrito' }));
router.get('/carrito/finalizar', (req, res) => res.render('carrito/finalizar_pedido', { layout: false }));
router.get('/pedido-exitoso/:id', (req, res) => res.render('carrito/pedido_exitoso', { layout: false, pedido_id: req.params.id }));

// ── Peluqueros (barbero) ───────────────────────────────────────────────────
router.get('/barbero', (req, res) => res.render('peluqueros/peluquero_dashboard', { layout: 'layouts/dashboard', title: 'Inicio barbero', active: 'inicio' }));
router.get('/barbero/perfil', (req, res) => res.render('peluqueros/peluquero_perfil', { layout: 'layouts/dashboard', title: 'Perfil barbero', active: 'perfil' }));
router.get('/barbero/nueva-cita', (req, res) => res.render('peluqueros/peluquero_crear_cita', { layout: 'layouts/dashboard', title: 'Nueva cita', active: 'nueva_cita' }));
router.get('/barbero/notificaciones', (req, res) => res.render('peluqueros/peluquero_notificaciones', { layout: 'layouts/dashboard', title: 'Notificaciones barbero', active: 'notificaciones' }));

// ── Administrador ──────────────────────────────────────────────────────────
router.get('/admin', (req, res) => res.render('administrador/admin_dashboard', { layout: 'layouts/dashboard', title: 'Panel de administración', active: 'dashboard' }));
router.get('/admin/usuarios', (req, res) => res.render('administrador/admin_usuarios', { layout: 'layouts/dashboard', title: 'Usuarios', active: 'usuarios' }));
router.get('/admin/usuarios/nuevo', (req, res) => res.render('administrador/admin_formulario_usuario', { layout: 'layouts/dashboard', title: 'Nuevo usuario' }));
router.get('/admin/usuarios/:id/editar', (req, res) => res.render('administrador/admin_formulario_usuario', { layout: 'layouts/dashboard', title: 'Editar usuario', usuario_id: req.params.id }));
router.get('/admin/peluqueros', (req, res) => res.render('administrador/admin_listar_peluqueros', { layout: 'layouts/dashboard', title: 'Barberos', active: 'peluqueros' }));
router.get('/admin/peluqueros/nuevo', (req, res) => res.render('administrador/admin_formulario_peluquero', { layout: 'layouts/dashboard', title: 'Nuevo barbero' }));
router.get('/admin/peluqueros/:id/editar', (req, res) => res.render('administrador/admin_formulario_peluquero', { layout: 'layouts/dashboard', title: 'Editar barbero', peluquero_id: req.params.id }));
router.get('/admin/reservas', (req, res) => res.render('administrador/admin_listar_reservas', { layout: 'layouts/dashboard', title: 'Reservas', active: 'reservas' }));
router.get('/admin/reservas/nueva', (req, res) => res.render('administrador/admin_formulario_reserva', { layout: 'layouts/dashboard', title: 'Nueva reserva' }));
router.get('/admin/reservas/:id/editar', (req, res) => res.render('administrador/admin_formulario_reserva', { layout: 'layouts/dashboard', title: 'Editar reserva', reserva_id: req.params.id }));
router.get('/admin/horarios', (req, res) => res.render('administrador/admin_horarios', { layout: 'layouts/dashboard', title: 'Horarios', active: 'horarios' }));
router.get('/admin/peluquerias', (req, res) => res.render('administrador/admin_peluquerias', { layout: 'layouts/dashboard', title: 'Barberías', active: 'peluquerias' }));
router.get('/admin/peluquerias/nueva', (req, res) => res.render('administrador/admin_formulario_peluqueria', { layout: 'layouts/dashboard', title: 'Nueva barbería' }));
router.get('/admin/peluquerias/:id/editar', (req, res) => res.render('administrador/admin_formulario_peluqueria', { layout: 'layouts/dashboard', title: 'Editar barbería', peluqueria_id: req.params.id }));
router.get('/admin/productos', (req, res) => res.render('administrador/admin_productos', { layout: 'layouts/dashboard', title: 'Productos', active: 'productos' }));
router.get('/admin/productos/nuevo', (req, res) => res.render('administrador/admin_formulario_producto', { layout: 'layouts/dashboard', title: 'Nuevo producto' }));
router.get('/admin/productos/:id/editar', (req, res) => res.render('administrador/admin_formulario_producto', { layout: 'layouts/dashboard', title: 'Editar producto', producto_id: req.params.id }));
router.get('/admin/mensajes', (req, res) => res.render('administrador/admin_mensajes', { layout: 'layouts/dashboard', title: 'Mensajes', active: 'mensajes' }));
router.get('/admin/notificaciones', (req, res) => res.render('administrador/admin_notificaciones', { layout: 'layouts/dashboard', title: 'Notificaciones', active: 'notificaciones' }));
router.get('/admin/ingresos', (req, res) => res.render('administrador/admin_listar_ingresos', { layout: 'layouts/dashboard', title: 'Ingresos', active: 'ingresos' }));

module.exports = router;