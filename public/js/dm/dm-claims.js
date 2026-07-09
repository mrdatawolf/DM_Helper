// dm-claims.js — split from app.js (behavior unchanged)
// ========== CLAIMS RANKINGS FUNCTIONS ==========

// Load claims rankings for DM view
async function loadClaimsRankings() {
    const container = document.getElementById('claims-rankings-container');
    const summaryContainer = document.getElementById('claims-summary-stats');

    container.innerHTML = '<div class="loading">Loading claims rankings...</div>';

    try {
        const response = await fetch('/api/claims/rankings/all/with-best');
        const rankings = await response.json();

        if (Object.keys(rankings).length === 0) {
            container.innerHTML = '<div style="text-align: center; color: #999; padding: 40px; font-style: italic;">No attribute claims have been made yet.</div>';
            summaryContainer.innerHTML = '';
            return;
        }

        // Calculate summary stats
        let totalAttributes = Object.keys(rankings).length;
        let totalClaims = 0;
        let totalPoints = 0;
        let mostCompetitiveAttr = '';
        let mostCompetitiveCount = 0;

        Object.entries(rankings).forEach(([attr, chars]) => {
            totalClaims += chars.length;
            chars.forEach(char => totalPoints += char.points_spent);

            if (chars.length > mostCompetitiveCount) {
                mostCompetitiveCount = chars.length;
                mostCompetitiveAttr = attr;
            }
        });

        summaryContainer.innerHTML = `
            <div style="background: var(--light); padding: 15px; border-radius: 8px; text-align: center;">
                <div style="font-size: 32px; font-weight: bold; color: var(--primary);">${totalAttributes}</div>
                <div style="font-size: 14px; color: #666; margin-top: 5px;">Attributes Claimed</div>
            </div>
            <div style="background: var(--light); padding: 15px; border-radius: 8px; text-align: center;">
                <div style="font-size: 32px; font-weight: bold; color: var(--primary);">${totalClaims}</div>
                <div style="font-size: 14px; color: #666; margin-top: 5px;">Total Claims</div>
            </div>
            <div style="background: var(--light); padding: 15px; border-radius: 8px; text-align: center;">
                <div style="font-size: 32px; font-weight: bold; color: var(--primary);">${totalPoints}</div>
                <div style="font-size: 14px; color: #666; margin-top: 5px;">Total Points Spent</div>
            </div>
            <div style="background: var(--light); padding: 15px; border-radius: 8px; text-align: center;">
                <div style="font-size: 32px; font-weight: bold; color: var(--primary);">${escHtml(mostCompetitiveAttr) || 'N/A'}</div>
                <div style="font-size: 14px; color: #666; margin-top: 5px;">Most Competitive (${mostCompetitiveCount} claims)</div>
            </div>
        `;

        // Render each attribute section
        container.innerHTML = '';
        Object.entries(rankings).forEach(([attributeName, characters]) => {
            const section = document.createElement('div');
            section.style.cssText = 'background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);';

            let tableHTML = `
                <h3 style="margin-top: 0; color: var(--primary); border-bottom: 2px solid var(--primary); padding-bottom: 10px;">${escHtml(attributeName)}</h3>
                <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                    <thead>
                        <tr style="background: var(--light);">
                            <th style="padding: 12px; text-align: left; font-weight: bold; border-bottom: 2px solid #ddd;">Rank</th>
                            <th style="padding: 12px; text-align: left; font-weight: bold; border-bottom: 2px solid #ddd;">Character</th>
                            <th style="padding: 12px; text-align: left; font-weight: bold; border-bottom: 2px solid #ddd;">Points Spent</th>
                            <th style="padding: 12px; text-align: left; font-weight: bold; border-bottom: 2px solid #ddd;">Justification</th>
                            <th style="padding: 12px; text-align: left; font-weight: bold; border-bottom: 2px solid #ddd;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            characters.forEach((char, index) => {
                let rankBadgeStyle = 'display: inline-block; background: #666; color: white; padding: 4px 12px; border-radius: 12px; font-size: 14px; font-weight: bold; min-width: 30px; text-align: center;';

                if (index === 0) {
                    rankBadgeStyle = rankBadgeStyle.replace('background: #666', 'background: #FFD700; color: #333');
                } else if (index === 1) {
                    rankBadgeStyle = rankBadgeStyle.replace('background: #666', 'background: #C0C0C0; color: #333');
                } else if (index === 2) {
                    rankBadgeStyle = rankBadgeStyle.replace('background: #666', 'background: #CD7F32');
                }

                tableHTML += `
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 12px;"><span style="${rankBadgeStyle}">#${char.rank_position}</span></td>
                        <td style="padding: 12px;">
                            <strong>${escHtml(char.character_name)}</strong>
                            ${char.is_best ? '<span style="display: inline-block; background: #4CAF50; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-left: 10px;">🏆 BEST</span>' : ''}
                        </td>
                        <td style="padding: 12px;"><span style="font-size: 18px; font-weight: bold; color: var(--primary);">${char.points_spent}</span> points</td>
                        <td style="padding: 12px;"><span style="font-style: italic; color: #666; font-size: 14px;">${escHtml(char.justification) || 'No justification provided'}</span></td>
                        <td style="padding: 12px;">
                            ${char.is_best ?
                                '<span style="color: #4CAF50; font-weight: bold;">Gets +2 total bonus</span>' :
                                '<span style="color: #666;">Gets +1 claim bonus</span>'}
                        </td>
                    </tr>
                `;
            });

            tableHTML += `
                    </tbody>
                </table>
            `;

            // Add secret bonus info for the best character
            const bestChar = characters.find(c => c.is_best);
            if (bestChar) {
                tableHTML += `
                    <div style="background: #e8f5e9; padding: 10px; border-radius: 4px; margin-top: 10px; border-left: 3px solid #4CAF50;">
                        <strong>🔒 Secret:</strong> ${bestChar.character_name} gets a hidden +1 bonus on top of the visible +1 claim bonus.
                        Players won't know who's truly the best, creating suspense!
                    </div>
                `;
            }

            section.innerHTML = tableHTML;
            container.appendChild(section);
        });

    } catch (error) {
        console.error('Error loading rankings:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #e74c3c;">
                <p>Failed to load rankings: ${error.message}</p>
                <button class="btn-primary" onclick="loadClaimsRankings()">Retry</button>
            </div>
        `;
    }
}

