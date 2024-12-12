// src/services/DialogService.js
let dialogs = [];

const getAllDialogs = () => {
    return dialogs.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

const createDialog = (title, initialMessages = []) => {
    const newDialog = {
        id: dialogs.length + 1,
        title,
        createdAt: new Date(),
        messages: initialMessages
    };
    dialogs.push(newDialog);
    return newDialog;
};

const getDialogById = (id) => {
    return dialogs.find(dialog => dialog.id === id);
};

export default {
    getAllDialogs,
    createDialog,
    getDialogById
};



