# GCP Monitoring and Logging Guide

This guide explains how to set up comprehensive monitoring and logging for the Family Hub application on Google Cloud Platform.

## Table of Contents

1. [Cloud Logging Setup](#cloud-logging-setup)
2. [Cloud Monitoring Setup](#cloud-monitoring-setup)
3. [Creating Alerts](#creating-alerts)
4. [Custom Metrics](#custom-metrics)
5. [Dashboards](#dashboards)
6. [Log Analysis](#log-analysis)
7. [Performance Monitoring](#performance-monitoring)
8. [Cost Monitoring](#cost-monitoring)
9. [Troubleshooting](#troubleshooting)

---

## Cloud Logging Setup

### 1. Enable Cloud Logging

```bash
# Cloud Logging is enabled by default for Cloud Run
# Verify it's enabled
gcloud services list --enabled | grep logging

# If not enabled, enable it
gcloud services enable logging.googleapis.com
```

### 2. View Cloud Run Logs

```bash
# View recent logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=family-hub" \
  --limit=50 \
  --format=json

# View logs with specific severity
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=family-hub AND severity=ERROR" \
  --limit=50 \
  --format=json

# Stream logs in real-time
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=family-hub" \
  --follow \
  --format=json
```

### 3. Create Log Sink

```bash
# Create log sink to export logs to Cloud Storage
gcloud logging sinks create family-hub-logs-storage \
  gs://family-hub-logs \
  --log-filter='resource.type="cloud_run_revision" AND resource.labels.service_name="family-hub"'

# Create log sink to export logs to BigQuery
gcloud logging sinks create family-hub-logs-bigquery \
  bigquery.googleapis.com/projects/PROJECT_ID/datasets/family_hub_logs \
  --log-filter='resource.type="cloud_run_revision" AND resource.labels.service_name="family-hub"'

# Create log sink to export logs to Pub/Sub
gcloud logging sinks create family-hub-logs-pubsub \
  pubsub.googleapis.com/projects/PROJECT_ID/topics/family-hub-logs \
  --log-filter='resource.type="cloud_run_revision" AND resource.labels.service_name="family-hub"'

# List sinks
gcloud logging sinks list
```

### 4. Configure Log Retention

```bash
# Set log retention to 30 days
gcloud logging buckets update _Default \
  --retention-days=30

# Set log retention to 90 days
gcloud logging buckets update _Default \
  --retention-days=90

# View bucket configuration
gcloud logging buckets describe _Default
```

### 5. Create Log-Based Metrics

```bash
# Create metric for error count
gcloud logging metrics create error_count \
  --description="Count of error logs" \
  --log-filter='severity="ERROR"'

# Create metric for warning count
gcloud logging metrics create warning_count \
  --description="Count of warning logs" \
  --log-filter='severity="WARNING"'

# Create metric for request latency
gcloud logging metrics create request_latency \
  --description="Request latency in milliseconds" \
  --log-filter='jsonPayload.latency_ms=~"[0-9]+"' \
  --value-extractor='EXTRACT(jsonPayload.latency_ms)'

# Create metric for database errors
gcloud logging metrics create database_errors \
  --description="Count of database errors" \
  --log-filter='jsonPayload.error_type="database"'

# List metrics
gcloud logging metrics list
```

---

## Cloud Monitoring Setup

### 1. Enable Cloud Monitoring

```bash
# Cloud Monitoring is enabled by default
# Verify it's enabled
gcloud services list --enabled | grep monitoring

# If not enabled, enable it
gcloud services enable monitoring.googleapis.com
```

### 2. Create Notification Channels

```bash
# Create email notification channel
gcloud alpha monitoring channels create \
  --display-name="Family Hub Alerts" \
  --type=email \
  --channel-labels=email_address=alerts@example.com

# Create Slack notification channel
gcloud alpha monitoring channels create \
  --display-name="Family Hub Slack" \
  --type=slack \
  --channel-labels=channel_name=#alerts

# Create PagerDuty notification channel
gcloud alpha monitoring channels create \
  --display-name="Family Hub PagerDuty" \
  --type=pagerduty \
  --channel-labels=service_key=YOUR_PAGERDUTY_KEY

# List notification channels
gcloud alpha monitoring channels list
```

### 3. Create Alert Policies

#### High CPU Usage Alert

```bash
# Create alert for CPU > 80%
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="Family Hub High CPU" \
  --condition-display-name="CPU > 80%" \
  --condition-threshold-value=80 \
  --condition-threshold-duration=300s \
  --condition-threshold-filter='resource.type="cloud_run_revision" AND metric.type="run.googleapis.com/cpu_utilization"'
```

#### High Memory Usage Alert

```bash
# Create alert for memory > 80%
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="Family Hub High Memory" \
  --condition-display-name="Memory > 80%" \
  --condition-threshold-value=80 \
  --condition-threshold-duration=300s \
  --condition-threshold-filter='resource.type="cloud_run_revision" AND metric.type="run.googleapis.com/memory_utilization"'
```

#### High Error Rate Alert

```bash
# Create alert for error rate > 5%
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="Family Hub High Error Rate" \
  --condition-display-name="Error Rate > 5%" \
  --condition-threshold-value=5 \
  --condition-threshold-duration=300s \
  --condition-threshold-filter='resource.type="cloud_run_revision" AND metric.type="logging.googleapis.com/user/error_count"'
```

#### High Latency Alert

```bash
# Create alert for latency > 1000ms
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="Family Hub High Latency" \
  --condition-display-name="Latency > 1000ms" \
  --condition-threshold-value=1000 \
  --condition-threshold-duration=300s \
  --condition-threshold-filter='resource.type="cloud_run_revision" AND metric.type="run.googleapis.com/request_latencies"'
```

#### Database Connection Errors Alert

```bash
# Create alert for database errors
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="Family Hub Database Errors" \
  --condition-display-name="Database Errors > 10" \
  --condition-threshold-value=10 \
  --condition-threshold-duration=300s \
  --condition-threshold-filter='resource.type="cloud_run_revision" AND metric.type="logging.googleapis.com/user/database_errors"'
```

#### Service Down Alert

```bash
# Create alert for service unavailability
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="Family Hub Service Down" \
  --condition-display-name="Service Unavailable" \
  --condition-threshold-value=0 \
  --condition-threshold-duration=60s \
  --condition-threshold-filter='resource.type="cloud_run_revision" AND metric.type="run.googleapis.com/request_count"'
```

### 4. List and Manage Alert Policies

```bash
# List all alert policies
gcloud alpha monitoring policies list

# Describe specific policy
gcloud alpha monitoring policies describe POLICY_ID

# Update alert policy
gcloud alpha monitoring policies update POLICY_ID \
  --update-notification-channels=CHANNEL_ID

# Delete alert policy
gcloud alpha monitoring policies delete POLICY_ID
```

---

## Creating Alerts

### Alert Policy Template

```bash
# Create comprehensive alert policy
cat > /tmp/alert-policy.yaml << 'EOF'
displayName: "Family Hub Comprehensive Alerts"
conditions:
  - displayName: "High CPU Usage"
    conditionThreshold:
      filter: 'resource.type="cloud_run_revision" AND metric.type="run.googleapis.com/cpu_utilization"'
      comparison: COMPARISON_GT
      thresholdValue: 80
      duration: 300s
  - displayName: "High Memory Usage"
    conditionThreshold:
      filter: 'resource.type="cloud_run_revision" AND metric.type="run.googleapis.com/memory_utilization"'
      comparison: COMPARISON_GT
      thresholdValue: 80
      duration: 300s
  - displayName: "High Error Rate"
    conditionThreshold:
      filter: 'resource.type="cloud_run_revision" AND metric.type="logging.googleapis.com/user/error_count"'
      comparison: COMPARISON_GT
      thresholdValue: 10
      duration: 300s
notificationChannels:
  - "projects/PROJECT_ID/notificationChannels/CHANNEL_ID"
EOF

# Create policy from template
gcloud alpha monitoring policies create --policy-from-file=/tmp/alert-policy.yaml
```

---

## Custom Metrics

### 1. Create Custom Metrics from Application

```typescript
// Example: Send custom metric from Node.js application
import { MetricServiceClient } from '@google-cloud/monitoring';

const client = new MetricServiceClient();

async function writeTimeSeries(value: number) {
  const projectName = client.projectPath(process.env.GCP_PROJECT_ID);

  const timeSeries = {
    metric: {
      type: 'custom.googleapis.com/family_hub/request_duration',
      labels: {
        service: 'family-hub',
        endpoint: '/api/donations',
      },
    },
    resource: {
      type: 'cloud_run_revision',
      labels: {
        service_name: 'family-hub',
        revision_name: process.env.CLOUD_RUN_REVISION,
      },
    },
    points: [
      {
        interval: {
          endTime: {
            seconds: Math.floor(Date.now() / 1000),
          },
        },
        value: {
          doubleValue: value,
        },
      },
    ],
  };

  const request = {
    name: projectName,
    timeSeries: [timeSeries],
  };

  await client.createTimeSeries(request);
}
```

### 2. Create Custom Metric Type

```bash
# Create custom metric type
gcloud monitoring metrics-descriptors create \
  --type=custom.googleapis.com/family_hub/donation_amount \
  --metric-kind=GAUGE \
  --value-type=DOUBLE \
  --description="Donation amount in USD" \
  --display-name="Donation Amount"

# List custom metrics
gcloud monitoring metrics-descriptors list --filter="metric.type:custom.googleapis.com"
```

---

## Dashboards

### 1. Create Monitoring Dashboard

```bash
# Create dashboard
gcloud monitoring dashboards create --config-from-file=- << 'EOF'
{
  "displayName": "Family Hub Dashboard",
  "mosaicLayout": {
    "columns": 12,
    "tiles": [
      {
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Request Count",
          "xyChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "metric.type=\"run.googleapis.com/request_count\" resource.type=\"cloud_run_revision\" resource.labels.service_name=\"family-hub\""
                  }
                }
              }
            ]
          }
        }
      },
      {
        "xPos": 6,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Request Latency (p95)",
          "xyChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "metric.type=\"run.googleapis.com/request_latencies\" resource.type=\"cloud_run_revision\" resource.labels.service_name=\"family-hub\""
                  }
                }
              }
            ]
          }
        }
      },
      {
        "yPos": 4,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "CPU Utilization",
          "xyChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "metric.type=\"run.googleapis.com/cpu_utilization\" resource.type=\"cloud_run_revision\" resource.labels.service_name=\"family-hub\""
                  }
                }
              }
            ]
          }
        }
      },
      {
        "xPos": 6,
        "yPos": 4,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Memory Utilization",
          "xyChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "metric.type=\"run.googleapis.com/memory_utilization\" resource.type=\"cloud_run_revision\" resource.labels.service_name=\"family-hub\""
                  }
                }
              }
            ]
          }
        }
      },
      {
        "yPos": 8,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Error Count",
          "xyChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "metric.type=\"logging.googleapis.com/user/error_count\" resource.type=\"cloud_run_revision\""
                  }
                }
              }
            ]
          }
        }
      },
      {
        "xPos": 6,
        "yPos": 8,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Active Instances",
          "xyChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "metric.type=\"run.googleapis.com/instance_count\" resource.type=\"cloud_run_revision\" resource.labels.service_name=\"family-hub\""
                  }
                }
              }
            ]
          }
        }
      }
    ]
  }
}
EOF

# List dashboards
gcloud monitoring dashboards list

# Describe dashboard
gcloud monitoring dashboards describe DASHBOARD_ID

# Delete dashboard
gcloud monitoring dashboards delete DASHBOARD_ID
```

### 2. Create Database Monitoring Dashboard

```bash
# Create Cloud SQL monitoring dashboard
gcloud monitoring dashboards create --config-from-file=- << 'EOF'
{
  "displayName": "Family Hub Database Dashboard",
  "mosaicLayout": {
    "columns": 12,
    "tiles": [
      {
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Database CPU Utilization",
          "xyChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "metric.type=\"cloudsql.googleapis.com/database/cpu/utilization\" resource.type=\"cloudsql_database\" resource.labels.database_id=\"PROJECT_ID:family-hub-db\""
                  }
                }
              }
            ]
          }
        }
      },
      {
        "xPos": 6,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Database Memory Utilization",
          "xyChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "metric.type=\"cloudsql.googleapis.com/database/memory/utilization\" resource.type=\"cloudsql_database\" resource.labels.database_id=\"PROJECT_ID:family-hub-db\""
                  }
                }
              }
            ]
          }
        }
      },
      {
        "yPos": 4,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Database Connections",
          "xyChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "metric.type=\"cloudsql.googleapis.com/database/postgresql/num_backends\" resource.type=\"cloudsql_database\" resource.labels.database_id=\"PROJECT_ID:family-hub-db\""
                  }
                }
              }
            ]
          }
        }
      },
      {
        "xPos": 6,
        "yPos": 4,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Database Disk Utilization",
          "xyChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "metric.type=\"cloudsql.googleapis.com/database/disk/utilization\" resource.type=\"cloudsql_database\" resource.labels.database_id=\"PROJECT_ID:family-hub-db\""
                  }
                }
              }
            ]
          }
        }
      }
    ]
  }
}
EOF
```

---

## Log Analysis

### 1. Query Logs with Advanced Filters

```bash
# Find all errors in the last hour
gcloud logging read "resource.type=cloud_run_revision AND severity=ERROR AND timestamp>=\"$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ)\"" \
  --limit=100 \
  --format=json

# Find slow requests (latency > 1000ms)
gcloud logging read "resource.type=cloud_run_revision AND jsonPayload.latency_ms>1000" \
  --limit=100 \
  --format=json

# Find database connection errors
gcloud logging read "resource.type=cloud_run_revision AND jsonPayload.error_type=database" \
  --limit=100 \
  --format=json

# Find authentication failures
gcloud logging read "resource.type=cloud_run_revision AND jsonPayload.error_type=auth" \
  --limit=100 \
  --format=json

# Find payment processing errors
gcloud logging read "resource.type=cloud_run_revision AND jsonPayload.error_type=payment" \
  --limit=100 \
  --format=json
```

### 2. Export Logs to BigQuery for Analysis

```bash
# Create BigQuery dataset
bq mk --dataset \
  --description="Family Hub logs" \
  --location=US \
  family_hub_logs

# Create log sink to BigQuery
gcloud logging sinks create family-hub-bigquery \
  bigquery.googleapis.com/projects/PROJECT_ID/datasets/family_hub_logs \
  --log-filter='resource.type="cloud_run_revision" AND resource.labels.service_name="family-hub"'

# Query logs in BigQuery
bq query --use_legacy_sql=false << 'EOF'
SELECT
  timestamp,
  severity,
  jsonPayload.message as message,
  jsonPayload.error_type as error_type,
  jsonPayload.latency_ms as latency_ms
FROM
  `PROJECT_ID.family_hub_logs.cloud_run_revision`
WHERE
  severity = "ERROR"
  AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
ORDER BY
  timestamp DESC
LIMIT 100
EOF
```

---

## Performance Monitoring

### 1. Monitor Request Performance

```bash
# Get request count by status code
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=family-hub" \
  --format='value(jsonPayload.status_code)' \
  --limit=1000 | sort | uniq -c

# Get average latency
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=family-hub" \
  --format='value(jsonPayload.latency_ms)' \
  --limit=1000 | awk '{sum+=$1; count++} END {print "Average latency: " sum/count "ms"}'

# Get p95 latency
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=family-hub" \
  --format='value(jsonPayload.latency_ms)' \
  --limit=1000 | sort -n | awk '{a[NR]=$1} END {print "P95 latency: " a[int(NR*0.95)] "ms"}'
```

### 2. Monitor Database Performance

```bash
# Get database query performance
gcloud logging read "resource.type=cloud_run_revision AND jsonPayload.query_duration_ms" \
  --format='value(jsonPayload.query_duration_ms)' \
  --limit=1000 | awk '{sum+=$1; count++} END {print "Average query time: " sum/count "ms"}'

# Get slow queries
gcloud logging read "resource.type=cloud_run_revision AND jsonPayload.query_duration_ms>1000" \
  --limit=100 \
  --format=json
```

### 3. Monitor Cache Performance

```bash
# Get cache hit rate
gcloud logging read "resource.type=cloud_run_revision AND jsonPayload.cache_hit" \
  --format='value(jsonPayload.cache_hit)' \
  --limit=1000 | grep -c "true" | awk '{print "Cache hit rate: " $1/10 "%"}'

# Get cache misses
gcloud logging read "resource.type=cloud_run_revision AND jsonPayload.cache_hit=false" \
  --limit=100 \
  --format=json
```

---

## Cost Monitoring

### 1. Set Up Billing Alerts

```bash
# Create billing alert for $100/month
gcloud billing budgets create \
  --billing-account=BILLING_ACCOUNT_ID \
  --display-name="Family Hub Monthly Budget" \
  --budget-amount=100 \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=90 \
  --threshold-rule=percent=100

# List budgets
gcloud billing budgets list --billing-account=BILLING_ACCOUNT_ID

# Describe budget
gcloud billing budgets describe BUDGET_ID --billing-account=BILLING_ACCOUNT_ID
```

### 2. Monitor Service Costs

```bash
# Get Cloud Run costs
gcloud billing accounts list
gcloud billing accounts get-iam-policy BILLING_ACCOUNT_ID

# Export billing data to BigQuery
bq mk --dataset \
  --description="Billing data" \
  --location=US \
  billing_data

# Query billing data
bq query --use_legacy_sql=false << 'EOF'
SELECT
  service.description,
  SUM(cost) as total_cost,
  SUM(usage.amount) as total_usage
FROM
  `PROJECT_ID.billing_data.gcp_billing_export_v1_BILLING_ACCOUNT_ID`
WHERE
  DATE(usage_start_time) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY
  service.description
ORDER BY
  total_cost DESC
EOF
```

---

## Troubleshooting

### Logs Not Appearing

```bash
# Check if Cloud Logging is enabled
gcloud services list --enabled | grep logging

# Check log sinks
gcloud logging sinks list

# Check service account permissions
gcloud projects get-iam-policy PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:*"

# Verify Cloud Run service is writing logs
gcloud run services describe family-hub --region=us-central1
```

### Metrics Not Appearing

```bash
# Check if Cloud Monitoring is enabled
gcloud services list --enabled | grep monitoring

# List available metrics
gcloud monitoring metrics-descriptors list

# Check metric data
gcloud monitoring time-series list \
  --filter='metric.type="run.googleapis.com/request_count"'
```

### Alert Not Triggering

```bash
# Check alert policy
gcloud alpha monitoring policies describe POLICY_ID

# Check notification channels
gcloud alpha monitoring channels list

# Test notification channel
gcloud alpha monitoring channels verify CHANNEL_ID
```

---

## Best Practices

1. **Set up comprehensive logging**: Log all errors, warnings, and important events
2. **Create meaningful alerts**: Alert on actionable metrics, not noise
3. **Monitor key metrics**: CPU, memory, latency, error rate, database connections
4. **Use custom metrics**: Track business metrics like donations, users, etc.
5. **Regular log review**: Review logs daily for patterns and issues
6. **Archive old logs**: Move old logs to Cloud Storage for cost savings
7. **Set up dashboards**: Create dashboards for different teams (ops, dev, business)
8. **Document alerts**: Document what each alert means and how to respond

---

**Last Updated**: January 2024
