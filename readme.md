## Getting Started

This is a repository for Backend Chat App: Express.js, Socket.io, Redis, Sequelize, PostgreSQL

[Frontend repository](https://github.com/AmrHedeiwy/client-chatapp)

Features:

- Real-time messaging using Socket.io
- Send attachments as messages using Cloudinary
- Messages can be edited, deleted, and viewed for status in real time for all users
- Data caching using IO-Redis
- Rate limiting by IP, User ID and Email
- 1:1 conversation and group conversations
- Member management (Remove, Role change member / Admin)
- Infinite loading for messages in batches of 20
- Infinite loading for contacts in batches of 10
- Customizable profile
- Group creation and customization
- Add/remove contacts
- ORM using Sequelize
- PostgreSQL database
- Authentication with Passport.js

### Prerequisites

**Node version 18.x.x**

### Cloning the repository

```
git clone https://github.com/AmrHedeiwy/server-chatapp
```

### Install packages

```
npm i
```

### Setup .env file

```
SENDGRID_API_KEY

CLIENT_URL
SERVER_URL

SESSION_SECRET

JWT_SECRET

GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET

CLOUDINARY_CLOAD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET

REDIS_PASSWORD
REDIS_PORT
REDIS_USER
REDIS_HOST

POSTGRES_USER
POSTGRES_HOST
POSTGRES_PASSWOR
POSTGRES_DATABASE
POSTGRES_PORT
```

### Start the app

```
npm run dev
```

### Available commands

Running commands with npm `npm run [command]`

| command | description                              |
| :------ | :--------------------------------------- |
| dev     | Starts a development instance of the app |
