const bcrypt = require('bcryptjs');

const password = 'TestPassword123!';
const hash = bcrypt.hashSync(password, 12);
console.log(hash);
