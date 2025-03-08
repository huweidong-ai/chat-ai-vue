// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import Login from '../views/Login.vue';
import Register from '../views/Register.vue';
import Upload from '../views/Upload.vue';
import ConversationListAndChat from '../components/ConversationListAndChat.vue';

const routes = [
    {
        path: '/',
        redirect: '/login'
    },
    {
        path: '/login',
        name: 'Login',
        component: Login
    },
    {
        path: '/register',
        name: 'Register',
        component: Register
    },
    {
        path: '/upload',
        name: 'Upload',
        component: Upload,
        meta: { requiresAuth: true }
    },
    {
        path: '/chat',
        name: 'Chat',
        component: ConversationListAndChat,
        meta: { requiresAuth: true }
    }
];

const router = createRouter({
    history: createWebHistory(process.env.BASE_URL),
    routes
});

// 添加全局路由守卫
router.beforeEach((to, from, next) => {
    const isAuthenticated = document.cookie.includes('authToken=');
    
    if (to.matched.some(record => record.meta.requiresAuth)) {
        if (!isAuthenticated) {
            next('/login');
        } else {
            next();
        }
    } else {
        next();
    }
});

export default router;



