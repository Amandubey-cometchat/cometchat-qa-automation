# CometChat Webhook Coverage Matrix

_Generated 2026-09-10T13:12:03.922Z from `src/registry/webhook.registry.ts`, cross-referenced with the latest local test run per environment._

| Category | Webhook | Method | PROD-EU | PROD-US | PROD-IN | STAGING-US |
|---|---|---|---|---|---|---|
| GROUP | group_created | REST | PASSED | AUTOMATED (not in last run) | AUTOMATED (not in last run) | PASSED |
| GROUP | group_updated | REST | PASSED | AUTOMATED (not in last run) | AUTOMATED (not in last run) | PASSED |
| GROUP | group_deleted | REST | PASSED | AUTOMATED (not in last run) | AUTOMATED (not in last run) | PASSED |
| GROUP | group_member_added | REST | PASSED | AUTOMATED (not in last run) | AUTOMATED (not in last run) | PASSED |
| GROUP | group_member_kicked | REST | PASSED | AUTOMATED (not in last run) | AUTOMATED (not in last run) | PASSED |
| GROUP | group_member_banned | REST | PASSED | AUTOMATED (not in last run) | AUTOMATED (not in last run) | PASSED |
| GROUP | group_member_unbanned | REST | PASSED | AUTOMATED (not in last run) | AUTOMATED (not in last run) | PASSED |
| GROUP | group_member_scope_changed | REST | PASSED | AUTOMATED (not in last run) | AUTOMATED (not in last run) | PASSED |
| GROUP | group_owner_transferred | REST | PASSED | AUTOMATED (not in last run) | AUTOMATED (not in last run) | PASSED |
| GROUP | group_member_joined | SDK | PASSED | AUTOMATED (not in last run) | AUTOMATED (not in last run) | PASSED |
| GROUP | group_member_left | SDK | PASSED | AUTOMATED (not in last run) | AUTOMATED (not in last run) | PASSED |
| MESSAGE | message_sent | REST | PASSED | AUTOMATED (not in last run) | AUTOMATED (not in last run) | FAILED |
| MESSAGE | message_edited | REST | PASSED | AUTOMATED (not in last run) | AUTOMATED (not in last run) | FAILED |
| MESSAGE | message_deleted | REST | FAILED | AUTOMATED (not in last run) | AUTOMATED (not in last run) | FAILED |
| MESSAGE | message_reaction_added | REST | PASSED | AUTOMATED (not in last run) | AUTOMATED (not in last run) | FAILED |
| MESSAGE | message_reaction_removed | REST | PASSED | AUTOMATED (not in last run) | AUTOMATED (not in last run) | FAILED |
| MESSAGE | user_mentioned | REST | PASSED | AUTOMATED (not in last run) | AUTOMATED (not in last run) | FAILED |
| MESSAGE | message_delivery_receipt | SDK | PASSED | AUTOMATED (not in last run) | AUTOMATED (not in last run) | PASSED |
| MESSAGE | message_read_receipt | SDK | PASSED | AUTOMATED (not in last run) | AUTOMATED (not in last run) | PASSED |
| MESSAGE | message_delivered_to_all | SDK | PASSED | AUTOMATED (not in last run) | AUTOMATED (not in last run) | PASSED |
| MESSAGE | message_read_by_all | SDK | PASSED | AUTOMATED (not in last run) | AUTOMATED (not in last run) | PASSED |
| MESSAGE | message_pinned | REST | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED |
| MESSAGE | message_unpinned | REST | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED |
| MESSAGE | conversation_pinned | REST | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED |
| MESSAGE | conversation_unpinned | REST | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED |
| CALLS | call_initiated | SDK | PASSED | AUTOMATED (not in last run) | AUTOMATED (not in last run) | PASSED |
| CALLS | call_unanswered | SDK | PASSED | AUTOMATED (not in last run) | AUTOMATED (not in last run) | PASSED |
| CALLS | call_cancelled | SDK | PASSED | AUTOMATED (not in last run) | AUTOMATED (not in last run) | PASSED |
| CALLS | call_rejected | SDK | PASSED | AUTOMATED (not in last run) | AUTOMATED (not in last run) | PASSED |
| CALLS | call_busy | SDK | PASSED | AUTOMATED (not in last run) | AUTOMATED (not in last run) | FAILED |
| CALLS | call_started | SDK | PASSED | AUTOMATED (not in last run) | AUTOMATED (not in last run) | FAILED |
| CALLS | call_participant_joined | SDK | PASSED | AUTOMATED (not in last run) | AUTOMATED (not in last run) | FAILED |
| CALLS | call_participant_left | SDK | PASSED | AUTOMATED (not in last run) | AUTOMATED (not in last run) | FAILED |
| CALLS | call_ended | SDK | PASSED | AUTOMATED (not in last run) | AUTOMATED (not in last run) | FAILED |
| MEETINGS | meeting_started | SDK | PASSED | AUTOMATED (not in last run) | AUTOMATED (not in last run) | FAILED |
| MEETINGS | meeting_participant_joined | SDK | PASSED | AUTOMATED (not in last run) | AUTOMATED (not in last run) | FAILED |
| MEETINGS | meeting_participant_left | SDK | PASSED | AUTOMATED (not in last run) | AUTOMATED (not in last run) | FAILED |
| MEETINGS | meeting_ended | SDK | PASSED | AUTOMATED (not in last run) | AUTOMATED (not in last run) | FAILED |
| MEETINGS | recording_generated | NONE | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| MEETINGS | transcription_generated | NONE | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| CAMPAIGN | after_notification_created | REST | BLOCKED | PASSED | FAILED | PASSED |
| CAMPAIGN | after_feed_item_sent | REST | BLOCKED | PASSED | FAILED | PASSED |
| CAMPAIGN | after_feed_item_delivered | REST | BLOCKED | PASSED | FAILED | PASSED |
| CAMPAIGN | after_feed_item_read | REST | BLOCKED | PASSED | FAILED | PASSED |
| CAMPAIGN | after_campaign_completed | REST | BLOCKED | PASSED | FAILED | PASSED |
| CAMPAIGN | after_feed_item_interacted | SDK | BLOCKED | PASSED | BLOCKED | BLOCKED |
| CAMPAIGN | after_push_notification_sent | REST | BLOCKED | PASSED | BLOCKED | BLOCKED |
| CAMPAIGN | after_push_notification_delivered | SDK | BLOCKED | PASSED | BLOCKED | BLOCKED |
| CAMPAIGN | after_push_notification_clicked | SDK | BLOCKED | PASSED | BLOCKED | BLOCKED |
| CAMPAIGN | after_campaign_failed | NONE | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| USER | user_blocked | REST | PASSED | AUTOMATED (not in last run) | AUTOMATED (not in last run) | PASSED |
| USER | user_unblocked | REST | PASSED | AUTOMATED (not in last run) | AUTOMATED (not in last run) | PASSED |
| USER | user_connection_status_changed | SDK | PASSED | AUTOMATED (not in last run) | AUTOMATED (not in last run) | PASSED |
| MODERATION | moderation_engine_blocked | REST | PASSED | AUTOMATED (not in last run) | AUTOMATED (not in last run) | FAILED |
| MODERATION | moderation_engine_approved | REST | PASSED | AUTOMATED (not in last run) | AUTOMATED (not in last run) | FAILED |
| MODERATION | moderation_manual_approved | NONE | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| LEGACY | after_message | REST | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED |
| LEGACY | before_message | REST | AUTOMATED (not in last run) | AUTOMATED (not in last run) | AUTOMATED (not in last run) | AUTOMATED (not in last run) |
| LEGACY | message_delivery_receipt_legacy | SDK | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED |
| LEGACY | message_read_receipt_legacy | SDK | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED |
| LEGACY | after_connection_status_changed | SDK | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED |

## Totals per environment

| Environment | Total | Passed | Failed | Skipped | Not implemented | Blocked |
|---|---|---|---|---|---|---|
| prod-eu | 61 | 38 | 1 | 0 | 8 | 13 |
| prod-us | 61 | 9 | 0 | 0 | 8 | 4 |
| prod-in | 61 | 0 | 5 | 0 | 8 | 8 |
| staging-us | 61 | 27 | 17 | 0 | 8 | 8 |
