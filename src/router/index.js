// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import ConversationListAndChat from '../components/ConversationListAndChat.vue';
import NewChat from '../components/NewChat.vue';

const routes = [
    {
        path: '/',
        name: 'ConversationListAndChat',
        component: ConversationListAndChat
    },
    {
        path: '/new-chat',
        name: 'NewChat',
        component: NewChat
    }
];

const router = createRouter({
    history: createWebHistory(process.env.BASE_URL),
    routes
});

export default router;



