alter type campaign_status add value if not exists 'generating' before 'ready';
alter type campaign_status add value if not exists 'failed' after 'generating';
