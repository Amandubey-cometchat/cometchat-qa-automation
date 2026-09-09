# CometChat Webhook Coverage Matrix

_Generated 2026-09-09T14:19:05.258Z from `src/registry/webhook.registry.ts`, cross-referenced with the latest local test run per environment._

| Category | Webhook | Method | PROD-EU | PROD-US | PROD-IN | STAGING-US |
|---|---|---|---|---|---|---|
| GROUP | group_created | REST | PASSED | PASSED | AUTOMATED (not in last run) | PASSED |
| GROUP | group_updated | REST | PASSED | PASSED | AUTOMATED (not in last run) | PASSED |
| GROUP | group_deleted | REST | PASSED | PASSED | AUTOMATED (not in last run) | PASSED |
| GROUP | group_member_added | REST | PASSED | PASSED | AUTOMATED (not in last run) | PASSED |
| GROUP | group_member_kicked | REST | PASSED | PASSED | AUTOMATED (not in last run) | PASSED |
| GROUP | group_member_banned | REST | PASSED | PASSED | AUTOMATED (not in last run) | PASSED |
| GROUP | group_member_unbanned | REST | PASSED | PASSED | AUTOMATED (not in last run) | PASSED |
| GROUP | group_member_scope_changed | REST | PASSED | PASSED | AUTOMATED (not in last run) | PASSED |
| GROUP | group_owner_transferred | REST | PASSED | PASSED | AUTOMATED (not in last run) | PASSED |
| GROUP | group_member_joined | SDK | PASSED | PASSED | AUTOMATED (not in last run) | PASSED |
| GROUP | group_member_left | SDK | PASSED | PASSED | AUTOMATED (not in last run) | PASSED |
| MESSAGE | message_sent | REST | PASSED | PASSED | AUTOMATED (not in last run) | PASSED |
| MESSAGE | message_edited | REST | PASSED | PASSED | AUTOMATED (not in last run) | FAILED |
| MESSAGE | message_deleted | REST | PASSED | PASSED | AUTOMATED (not in last run) | FAILED |
| MESSAGE | message_reaction_added | REST | PASSED | PASSED | AUTOMATED (not in last run) | FAILED |
| MESSAGE | message_reaction_removed | REST | PASSED | PASSED | AUTOMATED (not in last run) | FAILED |
| MESSAGE | user_mentioned | REST | PASSED | PASSED | AUTOMATED (not in last run) | FAILED |
| MESSAGE | message_delivery_receipt | SDK | PASSED | PASSED | AUTOMATED (not in last run) | FAILED |
| MESSAGE | message_read_receipt | SDK | PASSED | PASSED | AUTOMATED (not in last run) | FAILED |
| MESSAGE | message_delivered_to_all | SDK | PASSED | PASSED | AUTOMATED (not in last run) | FAILED |
| MESSAGE | message_read_by_all | SDK | PASSED | PASSED | AUTOMATED (not in last run) | FAILED |
| MESSAGE | message_pinned | REST | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED |
| MESSAGE | message_unpinned | REST | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED |
| MESSAGE | conversation_pinned | REST | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED |
| MESSAGE | conversation_unpinned | REST | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED |
| CALLS | call_initiated | SDK | PASSED | BLOCKED | AUTOMATED (not in last run) | BLOCKED |
| CALLS | call_unanswered | SDK | PASSED | BLOCKED | AUTOMATED (not in last run) | BLOCKED |
| CALLS | call_cancelled | SDK | PASSED | BLOCKED | AUTOMATED (not in last run) | BLOCKED |
| CALLS | call_rejected | SDK | PASSED | BLOCKED | AUTOMATED (not in last run) | BLOCKED |
| CALLS | call_busy | SDK | PASSED | BLOCKED | AUTOMATED (not in last run) | BLOCKED |
| CALLS | call_started | SDK | PASSED | BLOCKED | AUTOMATED (not in last run) | BLOCKED |
| CALLS | call_participant_joined | SDK | PASSED | BLOCKED | AUTOMATED (not in last run) | BLOCKED |
| CALLS | call_participant_left | SDK | PASSED | BLOCKED | AUTOMATED (not in last run) | BLOCKED |
| CALLS | call_ended | SDK | PASSED | BLOCKED | AUTOMATED (not in last run) | BLOCKED |
| MEETINGS | meeting_started | SDK | BLOCKED | BLOCKED | PASSED | BLOCKED |
| MEETINGS | meeting_participant_joined | SDK | BLOCKED | BLOCKED | AUTOMATED (not in last run) | BLOCKED |
| MEETINGS | meeting_participant_left | SDK | BLOCKED | BLOCKED | AUTOMATED (not in last run) | BLOCKED |
| MEETINGS | meeting_ended | SDK | BLOCKED | BLOCKED | AUTOMATED (not in last run) | BLOCKED |
| MEETINGS | recording_generated | NONE | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| MEETINGS | transcription_generated | NONE | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
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
| USER | user_blocked | REST | PASSED | PASSED | AUTOMATED (not in last run) | PASSED |
| USER | user_unblocked | REST | PASSED | PASSED | AUTOMATED (not in last run) | PASSED |
| USER | user_connection_status_changed | SDK | PASSED | PASSED | AUTOMATED (not in last run) | FAILED |
| MODERATION | moderation_engine_blocked | REST | PASSED | FAILED | AUTOMATED (not in last run) | PASSED |
| MODERATION | moderation_engine_approved | REST | PASSED | FAILED | AUTOMATED (not in last run) | PASSED |
| MODERATION | moderation_manual_approved | NONE | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| LEGACY | after_message | REST | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED |
| LEGACY | before_message | REST | FAILED | NOT_IMPLEMENTED | AUTOMATED (not in last run) | NOT_IMPLEMENTED |
| LEGACY | message_delivery_receipt_legacy | SDK | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED |
| LEGACY | message_read_receipt_legacy | SDK | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED |
| LEGACY | after_connection_status_changed | SDK | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED |

## Totals per environment

| Environment | Total | Passed | Failed | Skipped | Not implemented | Blocked |
|---|---|---|---|---|---|---|
| prod-eu | 61 | 35 | 1 | 0 | 8 | 17 |
| prod-us | 61 | 24 | 2 | 0 | 9 | 26 |
| prod-in | 61 | 1 | 0 | 0 | 8 | 13 |
| staging-us | 61 | 16 | 10 | 0 | 9 | 26 |
