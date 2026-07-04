- [ ] In entrire app change the logos
- [ ] add prompts and resources in mcp
- [ ] update docs with the latest mcp tools we have
- [ ] add toast messages in whole app wherever necc.
- [ ] add more relevant tools in each connector
- [x] in signin and register , in passowrd add a toggle of eye open and close for pass
- [ ] add relevant server loggers
- [ ] register mcp server to different registries (npx ..)
- [ ] GCP Integration
    - [x] gcp_list_instances
    - [x] gcp_get_instance
    - [x] gcp_list_buckets
    - [x] gcp_get_storage_bucket
    - [x] gcp_list_bucket_objects
    - [x] gcp_query_logs
    - [ ] gcp_list_cloud_run_services
    - [ ] gcp_get_cloud_run_service
    - [ ] gcp_list_cloud_run_revisions
    - [ ] gcp_list_clusters
    - [ ] gcp_get_cluster
    - [x] gcp_query_metrics
    - [x] gcp_list_metric_descriptors


1. kube-config.yml -> deployed
2. kube-memory will analyze this -> use kube-memory to deploy -> kubectl deploy <>
3. pod status

failure -> OOM
    3.a kuberneetes tools -> get logs, get pod status
            check prometheus -> check alerts and get impacted applications
    3.a.1 check cognee for past similar failures and it's remediation
    3.b remidiate/mitigate the issue -> last stable pod make it active
    3.c analyse the issue -> found
    3.d find who the on call engineer is
    3.e create an incident from pagerDuty -> icnident id
    3.f post an alert message on slack
            tag the engineer with incident id
    3.g use github tools -> to understand which commit / pr fcked up
            find the fix -> do the fix -> raise a PR
                add the PR link in the incident page
    3.h wait for everuything to get fixed
            replay the impacted applications

success
3.a post success event on slack
3.b proceed deployment
3.c clean (n-1) instances



impacted applications
POST /api/create-order failed 500 INTERNAL SERVER ERROR
 header, payload   {}

app_cpu: 2048
app_memory : 4096


prom_alerts
/api -> 1 min -> 4$$ -> raise alert





@soumya
- Describe how you have used Cognee in your project
- Connect integration -> Create API key -> Set up IDE (center)
- remove card background - https://kube-memory.buildlab.in/docs?tab=tools
- publish this mcp in open registries (5-6) 
    update these links in README -> https://smithery.ai/, awesome mcp, runstack integration
- /docs?tab=ide -> add images of supported clients(Cursor, Vs code, claude-code)
- Update readme for "MCP tool Catalog"
    ```
<details>
<summary>Prerequisites</summary>

- Docker
- Kubernetes
- kubectl

</details>

<details>
<summary>Installation</summary>

</details>

<details>
<summary>Troubleshooting</summary>

- Check logs
- Verify configuration
- Restart the service

</details>
```

- update README - use of Cognee in kube-memory
- Test kube-memory across Cursor, Antigravity, Vs code, claude-code

- Medium blog post - "An MCP That Debugs Kubernetes for You powered by CogneeCloud"
