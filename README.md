### Dashboards

dashboards

### Installation

You can install this app using the [bench](https://github.com/frappe/bench) CLI:

```bash
cd $PATH_TO_YOUR_BENCH
bench get-app $URL_OF_THIS_REPO --branch develop
bench install-app dashboards
```

### Contributing

This app uses `pre-commit` for code formatting and linting. Please [install pre-commit](https://pre-commit.com/#installation) and enable it for this repository:

```bash
cd apps/dashboards
pre-commit install
```

Pre-commit is configured to use the following tools for checking and formatting your code:

- ruff
- eslint
- prettier
- pyupgrade

### Deployment

GitHub Actions deployment is configured in `.github/workflows/deploy.yml` and follows the same update-only flow used by the `armada` app.

Required repository secrets:

- `SERVER_IP`: production server IP address.
- `SSH_PRIVATE_KEY`: private SSH key for root access to the server.
- `SITE_NAME`: Frappe site name to migrate.

Deployment runs automatically on push to `main`, or manually from the Actions tab. It updates the existing app checkout on the server, runs `bench build --app dashboards`, runs `bench --site <site> migrate`, clears cache, and restarts services.


### License

mit
