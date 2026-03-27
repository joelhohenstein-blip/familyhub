import { db } from "../../db/index.server";
import { errorLogs } from "../../db/schema";

export interface AlertThreshold {
  metric: string;
  operator: ">" | "<" | "==" | ">=" | "<=";
  value: number;
  severity: "low" | "medium" | "high" | "critical";
}

export interface Alert {
  id: string;
  threshold: AlertThreshold;
  currentValue: number;
  triggeredAt: Date;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  channel: "email" | "webhook" | "in-app";
  message: string;
}

export class AlertingService {
  private alerts: Map<string, Alert> = new Map();
  private alertCounter = 0;

  /**
   * Evaluate metrics against thresholds and trigger alerts
   */
  async evaluateThresholds(metrics: Record<string, number>, thresholds: AlertThreshold[]) {
    const triggeredAlerts: Alert[] = [];

    for (const threshold of thresholds) {
      const value = metrics[threshold.metric];

      if (value === undefined) {
        continue;
      }

      const isTriggered = this.evaluateCondition(value, threshold.operator, threshold.value);

      if (isTriggered) {
        const alert = await this.createAlert(threshold, value);
        triggeredAlerts.push(alert);
        await this.sendAlert("email", threshold, value);
      }
    }

    return triggeredAlerts;
  }

  /**
   * Send an alert via specified channel
   */
  async sendAlert(
    channel: "email" | "webhook" | "in-app",
    threshold: AlertThreshold,
    currentValue: number
  ) {
    const message = `Alert: ${threshold.metric} is ${threshold.operator} ${threshold.value} (current: ${currentValue})`;

    switch (channel) {
      case "email":
        return this.sendEmailAlert(message, threshold);
      case "webhook":
        return this.sendWebhookAlert(message, threshold);
      case "in-app":
        return this.sendInAppAlert(message, threshold);
    }
  }

  /**
   * Send email alert (placeholder)
   */
  private async sendEmailAlert(message: string, threshold: AlertThreshold) {
    try {
      console.log(`[EMAIL ALERT] ${message}`);
      return true;
    } catch (error) {
      console.error("Error sending email alert:", error);
      return false;
    }
  }

  /**
   * Send webhook alert (placeholder)
   */
  private async sendWebhookAlert(message: string, threshold: AlertThreshold) {
    try {
      console.log(`[WEBHOOK ALERT] ${message}`);
      return true;
    } catch (error) {
      console.error("Error sending webhook alert:", error);
      return false;
    }
  }

  /**
   * Send in-app alert
   */
  private async sendInAppAlert(message: string, threshold: AlertThreshold) {
    try {
      console.log(`[IN-APP ALERT] ${message}`);
      return true;
    } catch (error) {
      console.error("Error sending in-app alert:", error);
      return false;
    }
  }

  /**
   * Create an alert record
   */
  private async createAlert(threshold: AlertThreshold, value: number): Promise<Alert> {
    const id = `alert-${++this.alertCounter}`;
    const alert: Alert = {
      id,
      threshold,
      currentValue: value,
      triggeredAt: new Date(),
      acknowledged: false,
      channel: "email",
      message: `${threshold.metric} ${threshold.operator} ${threshold.value}`,
    };

    this.alerts.set(id, alert);
    return alert;
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string) {
    const alert = this.alerts.get(alertId);

    if (!alert) {
      throw new Error("Alert not found");
    }

    alert.acknowledged = true;
    alert.acknowledgedAt = new Date();

    return alert;
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter((alert) => !alert.acknowledged);
  }

  /**
   * Get alert by ID
   */
  getAlert(alertId: string): Alert | undefined {
    return this.alerts.get(alertId);
  }

  /**
   * Check error rate and trigger alerts if needed
   */
  async checkErrorRate(thresholdPercent: number = 5) {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      // For now, return empty array - actual query would go here
      return [];
    } catch (error) {
      console.error("Error checking error rate:", error);
      throw error;
    }
  }

  /**
   * Evaluate a condition
   */
  private evaluateCondition(value: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case ">":
        return value > threshold;
      case "<":
        return value < threshold;
      case "==":
        return value === threshold;
      case ">=":
        return value >= threshold;
      case "<=":
        return value <= threshold;
      default:
        return false;
    }
  }
}

export const alertingService = new AlertingService();
