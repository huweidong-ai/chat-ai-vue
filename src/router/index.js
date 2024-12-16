// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import ConversationListAndChat from '../components/ConversationListAndChat.vue';

const routes = [
    {
        path: '/',
        name: 'ConversationListAndChat',
        component: ConversationListAndChat
    }
];

const router = createRouter({
    history: createWebHistory(process.env.BASE_URL),
    routes
});

export default router;



