"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRegister = void 0;
const validateRegister = (options) => {
    if (options.email.includes('@')) {
        return [{
                field: 'email',
                message: 'Please enter a valid email'
            }];
    }
    ;
    if (options.username.includes('@')) {
        return [{
                field: 'username',
                message: '@ cannot be in username'
            }];
    }
    if (options.username.length <= 2) {
        return [{
                field: 'username',
                message: 'Username must be more than 2 characters'
            }];
    }
    ;
    if (options.password.length < 8) {
        return [{
                field: 'password',
                message: 'Password must at least 8 characters long'
            }];
    }
    ;
    return null;
};
exports.validateRegister = validateRegister;
//# sourceMappingURL=validateRegister.js.map