const { db } = require('../config/database');

async function log({ userId = null, action, resourceType, resourceId = null, oldValues = null, newValues = null, metadata = null }) {
  try {
    await db('audit_logs').insert({
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId !== null ? String(resourceId) : null,
      old_values: oldValues ? JSON.stringify(oldValues) : null,
      new_values: newValues ? JSON.stringify(newValues) : null,
      metadata: metadata ? JSON.stringify(metadata) : null,
    });
  } catch (err) {
    // Audit logging must not break the auth flow; log to server log.
    console.error('Audit log write failed:', err.message);
  }
}

module.exports = { log };
