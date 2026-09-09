# CometChat Webhook Coverage Matrix

_Generated 2026-09-09T08:23:59.979Z from `src/registry/webhook.registry.ts`, cross-referenced with the latest local test run per environment._

| Category | Webhook | Method | PROD-EU | PROD-US | PROD-IN | STAGING-US |
|---|---|---|---|---|---|---|
| GROUP | group_created | REST | AUTOMATED (not in last run) | PASSED | FAILED | PASSED |
| GROUP | group_updated | REST | AUTOMATED (not in last run) | PASSED | FAILED | PASSED |
| GROUP | group_deleted | REST | AUTOMATED (not in last run) | PASSED | FAILED | PASSED |
| GROUP | group_member_added | REST | AUTOMATED (not in last run) | PASSED | FAILED | PASSED |
| GROUP | group_member_kicked | REST | AUTOMATED (not in last run) | PASSED | FAILED | PASSED |
| GROUP | group_member_banned | REST | AUTOMATED (not in last run) | PASSED | PASSED | PASSED |
| GROUP | group_member_unbanned | REST | AUTOMATED (not in last run) | PASSED | PASSED | PASSED |
| GROUP | group_member_scope_changed | REST | AUTOMATED (not in last run) | PASSED | FAILED | PASSED |
| GROUP | group_owner_transferred | REST | AUTOMATED (not in last run) | PASSED | FAILED | PASSED |
| GROUP | group_member_joined | SDK | AUTOMATED (not in last run) | PASSED | FAILED | PASSED |
| GROUP | group_member_left | SDK | AUTOMATED (not in last run) | PASSED | FAILED | PASSED |
| MESSAGE | message_sent | REST | AUTOMATED (not in last run) | PASSED | FAILED | PASSED |
| MESSAGE | message_edited | REST | AUTOMATED (not in last run) | PASSED | FAILED | FAILED |
| MESSAGE | message_deleted | REST | AUTOMATED (not in last run) | PASSED | FAILED | FAILED |
| MESSAGE | message_reaction_added | REST | AUTOMATED (not in last run) | PASSED | FAILED | FAILED |
| MESSAGE | message_reaction_removed | REST | AUTOMATED (not in last run) | PASSED | FAILED | FAILED |
| MESSAGE | user_mentioned | REST | AUTOMATED (not in last run) | PASSED | FAILED | FAILED |
| MESSAGE | message_delivery_receipt | SDK | AUTOMATED (not in last run) | PASSED | FAILED | FAILED |
| MESSAGE | message_read_receipt | SDK | AUTOMATED (not in last run) | PASSED | FAILED | FAILED |
| MESSAGE | message_delivered_to_all | SDK | AUTOMATED (not in last run) | PASSED | FAILED | FAILED |
| MESSAGE | message_read_by_all | SDK | AUTOMATED (not in last run) | PASSED | FAILED | FAILED |
| MESSAGE | message_pinned | REST | NOT_IMPLEMENTED | NOT_IMPLEMENTED | — | NOT_IMPLEMENTED |
| MESSAGE | message_unpinned | REST | NOT_IMPLEMENTED | NOT_IMPLEMENTED | — | NOT_IMPLEMENTED |
| MESSAGE | conversation_pinned | REST | NOT_IMPLEMENTED | NOT_IMPLEMENTED | — | NOT_IMPLEMENTED |
| MESSAGE | conversation_unpinned | REST | NOT_IMPLEMENTED | NOT_IMPLEMENTED | — | NOT_IMPLEMENTED |
| CALLS | call_initiated | SDK | PASSED | BLOCKED | BLOCKED | BLOCKED |
| CALLS | call_unanswered | SDK | PASSED | BLOCKED | BLOCKED | BLOCKED |
| CALLS | call_cancelled | SDK | PASSED | BLOCKED | BLOCKED | BLOCKED |
| CALLS | call_rejected | SDK | PASSED | BLOCKED | BLOCKED | BLOCKED |
| CALLS | call_started | NONE | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| CALLS | call_participant_joined | NONE | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| CALLS | call_participant_left | NONE | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| CALLS | call_ended | NONE | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| CALLS | call_busy | NONE | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| MEETINGS | meeting_started | NONE | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| MEETINGS | meeting_participant_joined | NONE | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| MEETINGS | meeting_participant_left | NONE | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| MEETINGS | meeting_ended | NONE | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| MEETINGS | recording_generated | NONE | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| MEETINGS | transcription_generated | NONE | BLOCKED | BLOCKED | — | BLOCKED |
| CAMPAIGN | after_campaign_completed | NONE | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| CAMPAIGN | after_campaign_failed | NONE | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| CAMPAIGN | after_feed_item_read | NONE | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| CAMPAIGN | after_feed_item_interacted | NONE | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| CAMPAIGN | after_feed_item_sent | NONE | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| CAMPAIGN | after_push_notification_clicked | NONE | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| CAMPAIGN | after_notification_created | NONE | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| CAMPAIGN | after_feed_item_delivered | NONE | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| CAMPAIGN | after_push_notification_sent | NONE | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| CAMPAIGN | after_push_notification_delivered | NONE | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| USER | user_blocked | REST | AUTOMATED (not in last run) | PASSED | FAILED | PASSED |
| USER | user_unblocked | REST | AUTOMATED (not in last run) | PASSED | FAILED | PASSED |
| USER | user_connection_status_changed | SDK | AUTOMATED (not in last run) | PASSED | FAILED | FAILED |
| MODERATION | moderation_engine_blocked | REST | AUTOMATED (not in last run) | FAILED | NOT_IMPLEMENTED | PASSED |
| MODERATION | moderation_engine_approved | REST | AUTOMATED (not in last run) | FAILED | NOT_IMPLEMENTED | PASSED |
| MODERATION | moderation_manual_approved | NONE | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| LEGACY | after_message | REST | NOT_IMPLEMENTED | NOT_IMPLEMENTED | — | NOT_IMPLEMENTED |
| LEGACY | before_message | REST | NOT_IMPLEMENTED | NOT_IMPLEMENTED | — | NOT_IMPLEMENTED |
| LEGACY | message_delivery_receipt_legacy | SDK | NOT_IMPLEMENTED | NOT_IMPLEMENTED | — | NOT_IMPLEMENTED |
| LEGACY | message_read_receipt_legacy | SDK | NOT_IMPLEMENTED | NOT_IMPLEMENTED | — | NOT_IMPLEMENTED |
| LEGACY | after_connection_status_changed | SDK | NOT_IMPLEMENTED | NOT_IMPLEMENTED | — | NOT_IMPLEMENTED |

## Totals per environment

| Environment | Total | Passed | Failed | Skipped | Not implemented | Blocked |
|---|---|---|---|---|---|---|
| prod-eu | 61 | 4 | 0 | 0 | 9 | 22 |
| prod-us | 61 | 24 | 2 | 0 | 9 | 26 |
| prod-in | 51 | 2 | 22 | 0 | 2 | 25 |
| staging-us | 61 | 16 | 10 | 0 | 9 | 26 |
