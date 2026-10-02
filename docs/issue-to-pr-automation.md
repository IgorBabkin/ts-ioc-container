# Issue-to-pull-request automation

The **Automated implementation request** issue form explicitly opts a request into GitHub Copilot. The GitHub Agentic Workflow starts on issue creation and runs a weekly backlog check. It creates at most one draft pull request per run; maintainers still review, test, and merge every change.

## Enable the workflow

1. Ensure GitHub Actions and GitHub Copilot cloud agent are available for this repository.
2. Create a fine-grained personal access token with the **Copilot Requests: Read** account permission and add it under **Settings → Secrets and variables → Actions** as `COPILOT_GITHUB_TOKEN`. Do not add repository write permissions to this token; GitHub Agentic Workflows applies pull-request changes through its restricted safe-output job.
3. Ensure repository Actions settings permit the workflow to run. GitHub Agentic Workflows ignore issue events from users without write access by default, so requests from outside collaborators are not automatically processed.
4. Review `.github/workflows/issue-to-draft-pr.md` and its generated `.lock.yml` together. To update the generated workflow, install the [GitHub Agentic Workflows CLI](https://github.com/github/gh-aw) and run `gh aw compile`.

The workflow is intentionally limited to explicitly authorized requests, one draft pull request per run, and a 250 AI Credit budget per run. It never merges or publishes. Pull requests created with the default workflow token may not start other Actions workflows automatically; a maintainer may need to approve or start checks before merging.
