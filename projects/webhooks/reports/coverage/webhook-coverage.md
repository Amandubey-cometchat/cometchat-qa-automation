# CometChat Webhook Coverage Matrix

_Generated 2026-09-17T14:37:35.446Z from `src/registry/webhook.registry.ts`, cross-referenced with the latest local test run per environment._

| Category | Webhook | Method | PROD-EU | PROD-US | PROD-IN | STAGING-US |
|---|---|---|---|---|---|---|
| GROUP | group_created | REST | PASSED | PASSED | PASSED | AUTOMATED (not in last run) |
| GROUP | group_updated | REST | PASSED | PASSED | PASSED | AUTOMATED (not in last run) |
| GROUP | group_deleted | REST | PASSED | PASSED | PASSED | AUTOMATED (not in last run) |
| GROUP | group_member_added | REST | PASSED | PASSED | PASSED | AUTOMATED (not in last run) |
| GROUP | group_member_kicked | REST | PASSED | PASSED | PASSED | AUTOMATED (not in last run) |
| GROUP | group_member_banned | REST | PASSED | PASSED | PASSED | AUTOMATED (not in last run) |
| GROUP | group_member_unbanned | REST | PASSED | PASSED | PASSED | AUTOMATED (not in last run) |
| GROUP | group_member_scope_changed | REST | PASSED | PASSED | PASSED | AUTOMATED (not in last run) |
| GROUP | group_owner_transferred | REST | PASSED | PASSED | PASSED | AUTOMATED (not in last run) |
| GROUP | group_member_joined | SDK | PASSED | PASSED | PASSED | AUTOMATED (not in last run) |
| GROUP | group_member_left | SDK | PASSED | PASSED | PASSED | AUTOMATED (not in last run) |
| MESSAGE | message_sent | REST | PASSED | PASSED | PASSED | AUTOMATED (not in last run) |
| MESSAGE | message_edited | REST | PASSED | PASSED | PASSED | AUTOMATED (not in last run) |
| MESSAGE | message_deleted | REST | PASSED | PASSED | PASSED | AUTOMATED (not in last run) |
| MESSAGE | message_reaction_added | REST | PASSED | PASSED | PASSED | AUTOMATED (not in last run) |
| MESSAGE | message_reaction_removed | REST | PASSED | PASSED | PASSED | AUTOMATED (not in last run) |
| MESSAGE | user_mentioned | REST | PASSED | PASSED | PASSED | AUTOMATED (not in last run) |
| MESSAGE | message_delivery_receipt | SDK | PASSED | PASSED | PASSED | AUTOMATED (not in last run) |
| MESSAGE | message_read_receipt | SDK | PASSED | PASSED | PASSED | AUTOMATED (not in last run) |
| MESSAGE | message_delivered_to_all | SDK | PASSED | PASSED | PASSED | AUTOMATED (not in last run) |
| MESSAGE | message_read_by_all | SDK | PASSED | PASSED | PASSED | AUTOMATED (not in last run) |
| MESSAGE | message_pinned | REST | PASSED | FAILED | NOT_IMPLEMENTED | AUTOMATED (not in last run) |
| MESSAGE | message_unpinned | REST | PASSED | FAILED | NOT_IMPLEMENTED | AUTOMATED (not in last run) |
| MESSAGE | conversation_pinned | REST | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED |
| MESSAGE | conversation_unpinned | REST | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED |
| CALLS | call_initiated | SDK | PASSED | PASSED | PASSED | AUTOMATED (not in last run) |
| CALLS | call_unanswered | SDK | PASSED | PASSED | PASSED | AUTOMATED (not in last run) |
| CALLS | call_cancelled | SDK | PASSED | PASSED | PASSED | AUTOMATED (not in last run) |
| CALLS | call_rejected | SDK | PASSED | PASSED | PASSED | AUTOMATED (not in last run) |
| CALLS | call_busy | SDK | PASSED | PASSED | PASSED | AUTOMATED (not in last run) |
| CALLS | call_started | SDK | PASSED | PASSED | PASSED | AUTOMATED (not in last run) |
| CALLS | call_participant_joined | SDK | PASSED | FAILED | PASSED | AUTOMATED (not in last run) |
| CALLS | call_participant_left | SDK | PASSED | FAILED | PASSED | AUTOMATED (not in last run) |
| CALLS | call_ended | SDK | PASSED | PASSED | FAILED | AUTOMATED (not in last run) |
| MEETINGS | meeting_started | SDK | PASSED | PASSED | PASSED | AUTOMATED (not in last run) |
| MEETINGS | meeting_participant_joined | SDK | PASSED | PASSED | PASSED | AUTOMATED (not in last run) |
| MEETINGS | meeting_participant_left | SDK | PASSED | PASSED | PASSED | AUTOMATED (not in last run) |
| MEETINGS | meeting_ended | SDK | PASSED | PASSED | PASSED | AUTOMATED (not in last run) |
| MEETINGS | recording_generated | NONE | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| MEETINGS | transcription_generated | NONE | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| CAMPAIGN | after_notification_created | REST | PASSED | PASSED | PASSED | AUTOMATED (not in last run) |
| CAMPAIGN | after_feed_item_sent | REST | PASSED | PASSED | PASSED | AUTOMATED (not in last run) |
| CAMPAIGN | after_feed_item_delivered | REST | PASSED | PASSED | PASSED | AUTOMATED (not in last run) |
| CAMPAIGN | after_feed_item_read | REST | PASSED | PASSED | PASSED | AUTOMATED (not in last run) |
| CAMPAIGN | after_campaign_completed | REST | FAILED | PASSED | PASSED | AUTOMATED (not in last run) |
| CAMPAIGN | after_feed_item_interacted | SDK | PASSED | PASSED | PASSED | AUTOMATED (not in last run) |
| CAMPAIGN | after_push_notification_sent | REST | PASSED | PASSED | PASSED | AUTOMATED (not in last run) |
| CAMPAIGN | after_push_notification_delivered | SDK | PASSED | PASSED | PASSED | AUTOMATED (not in last run) |
| CAMPAIGN | after_push_notification_clicked | SDK | PASSED | PASSED | PASSED | AUTOMATED (not in last run) |
| CAMPAIGN | after_campaign_failed | NONE | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| USER | user_blocked | REST | PASSED | PASSED | PASSED | AUTOMATED (not in last run) |
| USER | user_unblocked | REST | PASSED | PASSED | PASSED | AUTOMATED (not in last run) |
| USER | user_connection_status_changed | SDK | PASSED | PASSED | PASSED | AUTOMATED (not in last run) |
| MODERATION | moderation_engine_blocked | REST | PASSED | FAILED | FAILED | AUTOMATED (not in last run) |
| MODERATION | moderation_engine_approved | REST | PASSED | PASSED | FAILED | AUTOMATED (not in last run) |
| MODERATION | moderation_manual_approved | NONE | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| LEGACY | after_message | REST | AUTOMATED (not in last run) | AUTOMATED (not in last run) | NOT_IMPLEMENTED | AUTOMATED (not in last run) |
| LEGACY | before_message | REST | AUTOMATED (not in last run) | AUTOMATED (not in last run) | AUTOMATED (not in last run) | AUTOMATED (not in last run) |
| LEGACY | message_delivery_receipt_legacy | SDK | AUTOMATED (not in last run) | AUTOMATED (not in last run) | NOT_IMPLEMENTED | AUTOMATED (not in last run) |
| LEGACY | message_read_receipt_legacy | SDK | AUTOMATED (not in last run) | AUTOMATED (not in last run) | NOT_IMPLEMENTED | AUTOMATED (not in last run) |
| LEGACY | after_connection_status_changed | SDK | AUTOMATED (not in last run) | AUTOMATED (not in last run) | NOT_IMPLEMENTED | AUTOMATED (not in last run) |
| NOTIFICATION | email-notification-payload-generated | REST | AUTOMATED (not in last run) | AUTOMATED (not in last run) | — | NOT_IMPLEMENTED |
| NOTIFICATION | sms-notification-payload-generated | REST | AUTOMATED (not in last run) | AUTOMATED (not in last run) | — | NOT_IMPLEMENTED |
| NOTIFICATION | push-notification-payload-generated | REST | AUTOMATED (not in last run) | AUTOMATED (not in last run) | — | — |

## Totals per environment

| Environment | Total | Passed | Failed | Skipped | Not implemented | Blocked |
|---|---|---|---|---|---|---|
| prod-eu | 64 | 49 | 1 | 0 | 2 | 4 |
| prod-us | 64 | 45 | 5 | 0 | 2 | 4 |
| prod-in | 61 | 45 | 3 | 0 | 8 | 4 |
| staging-us | 64 | 0 | 0 | 0 | 4 | 5 |
