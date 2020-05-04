module.exports = {
    path: '/pets',
    method: 'POST',
    status: (_, response, next) => {
        response.status(201);
        next();
    },
    template: {},
};
