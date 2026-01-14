# 🚀 Getting started with Strapi

Strapi comes with a full featured [Command Line Interface](https://docs.strapi.io/developer-docs/latest/developer-resources/cli/CLI.html) (CLI) which lets you scaffold and manage your project in seconds.

### `develop`

Start your Strapi application with autoReload enabled. [Learn more](https://docs.strapi.io/developer-docs/latest/developer-resources/cli/CLI.html#strapi-develop)

```
npm run develop
# or
yarn develop
```

### `start`

Start your Strapi application with autoReload disabled. [Learn more](https://docs.strapi.io/developer-docs/latest/developer-resources/cli/CLI.html#strapi-start)

```
npm run start
# or
yarn start
```

### `build`

Build your admin panel. [Learn more](https://docs.strapi.io/developer-docs/latest/developer-resources/cli/CLI.html#strapi-build)

```
npm run build
# or
yarn build
```

## ⚙️ Deployment

We use CDK to deploy.
Every time you merge into `develop`, the CMS is deployed into our test environment. 
To deploy to production, you need to run [this GitHub action](.github/workflows/deploy-stumblecms-live.yml) manually.

You can also deploy from local with `make deploy development`.
If during the deploy you have problems, you can stop the deploy with:
- Check status
```bash 
make deploy_status development
```

- Stop deploy
```bash
make deploy_stop development
```

- If the status is `UPDATE_ROLLBACK_FAILED`, continue with rollback
```bash
make deploy_rollback development
```

- You can wait for the rollback to finish with
```bash
make deploy_wait development
```

## ⚙️ Environments
If you want to add a new dev environment, you need to add a new environment in the bin/cdk.ts file, under the environmentConfigs array (you can copy `test` as example).
This will create a new environment in the AWS account, with the proper configuration (including RDS database, ECS...).
The first time you apply the CDK stack it will create the database, but it will not be initialized, so the creation of ECS cluster will fail.  
After failing, connect to the RDS database and run the following command to create it:
```sql
CREATE DATABASE strapi
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci
  DEFAULT ENCRYPTION='N';
````
Then you can run the CDK stack again and it will create the ECS cluster.

## 👷‍♂️ Infrastructure
- Build the docker image
```bash
make build
```

- Start the docker container
```bash
make start
```

- Stop the docker container
```bash
make stop
```

- Get diff with infrastructure changes
```bash
make diff development
```

- Deploy infrastructure changes
```bash
make deploy development
```

## 🔌 Gridly Integration Plugin Logging

The Gridly Integration plugin includes a configurable logging system to control the verbosity of log messages. This helps manage log output in different environments and during debugging.

### Log Levels

The plugin supports four log levels (from least to most verbose):

- **`error`** - Only error messages (critical failures)
- **`warn`** - Warnings and errors
- **`info`** - Informational messages, warnings, and errors (default for production)
- **`debug`** - All messages including detailed debugging information (default for development)

### Configuration Methods

The log level can be configured in two ways (in order of precedence):

#### 1. Environment Variable (Recommended)

Set the `GRIDLY_LOG_LEVEL` environment variable:

```bash
# .env file
GRIDLY_LOG_LEVEL=debug

# Or export in shell
export GRIDLY_LOG_LEVEL=info
```

#### 2. Plugin Configuration

Configure in `config/plugins.js`:

```javascript
"gridly-integration": {
  enabled: true,
  resolve: "./src/plugins/gridly-integration",
  config: {
    logLevel: "debug", // 'error', 'warn', 'info', or 'debug'
  },
},
```

### Default Behavior

- **Production** (`NODE_ENV=production`): Defaults to `info` level
- **Development**: Defaults to `debug` level

### Usage Examples

```bash
# Enable debug logging for troubleshooting
GRIDLY_LOG_LEVEL=debug npm run develop

# Use minimal logging (errors only) in production
GRIDLY_LOG_LEVEL=error npm run start

# Enable warnings and errors
GRIDLY_LOG_LEVEL=warn npm run develop
```

### Log Output

All log messages from the Gridly Integration plugin are prefixed with `[Gridly Integration]` for easy identification in log files.

## 📚 Learn more

- [Resource center](https://strapi.io/resource-center) - Strapi resource center.
- [Strapi documentation](https://docs.strapi.io) - Official Strapi documentation.
- [Strapi tutorials](https://strapi.io/tutorials) - List of tutorials made by the core team and the community.
- [Strapi blog](https://docs.strapi.io) - Official Strapi blog containing articles made by the Strapi team and the community.
- [Changelog](https://strapi.io/changelog) - Find out about the Strapi product updates, new features and general improvements.

Feel free to check out the [Strapi GitHub repository](https://github.com/strapi/strapi). Your feedback and contributions are welcome!

## ✨ Community

- [Discord](https://discord.strapi.io) - Come chat with the Strapi community including the core team.
- [Forum](https://forum.strapi.io/) - Place to discuss, ask questions and find answers, show your Strapi project and get feedback or just talk with other Community members.
- [Awesome Strapi](https://github.com/strapi/awesome-strapi) - A curated list of awesome things related to Strapi.

---

<sub>🤫 Psst! [Strapi is hiring](https://strapi.io/careers).</sub>
