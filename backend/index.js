require('dotenv').config();
const express = require('express');
const swaggerUI = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');
const rootRouter = require('./routes/index');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'walletAPI',
      version: '1.0.0',
      description:
        'A simple Express Wallet API that supports ACID transactions',
    },
    servers: [
      {
        url: 'http://localhost:3000',
      },
    ],
  },
  apis: ['./routes/account.js', './routes/user.js'],
};

const specs = swaggerJsDoc(options);

app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(specs));

app.use('/api/v1', rootRouter);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 ~ app.listen ~ ${PORT}`);
});
