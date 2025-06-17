[![N|Solid](https://static.wixstatic.com/media/72ffe6_da8d2142d49c42b29c96ba80c8a91a6c~mv2.png)](https://nasriya.net)

# Orchestriq.
[![Static Badge](https://img.shields.io/badge/license-NPCL-blue)](https://github.com/nasriyasoftware/Orchestriq?tab=License-1-ov-file) ![Repository Size](https://img.shields.io/github/repo-size/nasriyasoftware/Orchestriq.svg) ![Last Commit](https://img.shields.io/github/last-commit/nasriyasoftware/Orchestriq.svg) [![Status](https://img.shields.io/badge/Status-Stable-green.svg)](link-to-your-status-page)

##### Visit us at [www.nasriya.net](https://nasriya.net).

Made with ❤️ in **Palestine** 🇵🇸
___
#### Overview
Orchestriq is a TypeScript library designed for seamless Docker management via code. It provides a high-level API to interact with containers, images, networks, and volumes, supporting both local Docker daemons and remote Docker hosts over the internet. With a clean and efficient design, Orchestriq simplifies automation, orchestration, and containerized application management.

> [!IMPORTANT]
> 
> 🌟 **Support Our Open-Source Development!** 🌟
> We need your support to keep our projects going! If you find our work valuable, please consider contributing. Your support helps us continue to develop and maintain these tools.
> 
> **[Click here to support us!](https://fund.nasriya.net/)**
> 
> Every contribution, big or small, makes a difference. Thank you for your generosity and support!
___
### Installation
```shell
npm i @nasriya/orchestriq
```

### Importing
Import in **ES6** module
```ts
import orchestriq from '@nasriya/orchestriq';
```

Import in **CommonJS (CJS)**
```js
const orchestriq = require('@nasriya/orchestriq').default;
```
___

### Connect to Docker

Connect to Docker running locally on the current machine:
```js
const docker = new orchestriq.Docker();
```

If you need to set the socket path:
```js
const docker = new orchestriq.Docker({
    hostType: 'local',
    socketPath: '/var/run/docker.sock'
});
```

Connect to remotely to the Docker daemon's socket:
```js
const docker = new orchestriq.Docker({
    hostType: 'remote',
    /**The URL of the Docker daemon to connect to. */
    host: 'https://daemon.nasriya.net/',
    /**
     * If authentication is required (as it should be),
     * provide the necessary credentials here.
     */
    authentication: {
        type: 'Basic',
        username: process.env.DOCKER_DAEMON_USERNAME,
        password: process.env.DOCKER_DAEMON_PASSWORD
    }
});
```
**Note:** If you decided to expose the daemon APIs on the internet, you should setup authentications and access list to protect your the Docker APIs from unauthorized access.

___
Wanna learn more? [Checkout our Wiki](https://github.com/nasriyasoftware/Orchestriq/wiki).

___
## License
This software is licensed under the **Nasriya Personal & Commercial License (NPCL)**, version 1.0.
Please read the license from [here](https://github.com/nasriyasoftware/Orchestriq?tab=License-1-ov-file).