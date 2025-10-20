#!/usr/bin/env python3
"""
Dynamic Open Graph Image Generator for FPL Dashboard
Generates social media preview images with current league data
"""

import json
import os
from datetime import datetime
from PIL import Image, ImageDraw, ImageFont
import requests
from io import BytesIO

class DynamicImageGenerator:
    def __init__(self):
        self.width = 1200
        self.height = 630
        self.background_color = (30, 41, 59)  # Dark slate
        self.primary_color = (59, 130, 246)   # Blue
        self.accent_color = (16, 185, 129)    # Green
        self.text_color = (255, 255, 255)     # White
        self.secondary_text = (203, 213, 225) # Slate-300
        
    def load_dashboard_data(self):
        """Load current dashboard data from JSON files"""
        try:
            # Load the most recent gameweek data
            gameweeks = ['gw8', 'gw7', 'gw6', 'gw5', 'gw4', 'gw3', 'gw2', 'gw1']
            
            for gw in gameweeks:
                json_path = f"docs/data/{gw}.json"
                if os.path.exists(json_path):
                    with open(json_path, 'r') as f:
                        data = json.load(f)
                        return data, gw
            return None, None
        except Exception as e:
            print(f"Error loading dashboard data: {e}")
            return None, None
    
    def get_leaderboard_data(self, data):
        """Extract leaderboard data from dashboard data"""
        if not data or 'leaderboard' not in data:
            return []
        
        # Sort by total points (descending)
        leaderboard = sorted(data['leaderboard'], 
                           key=lambda x: x.get('totalPoints', 0), 
                           reverse=True)
        return leaderboard[:5]  # Top 5 teams
    
    def get_weekly_winner(self, data):
        """Get current weekly winner"""
        if not data or 'weeklyWinner' not in data:
            return "TBD"
        return data['weeklyWinner']
    
    def get_current_gameweek(self, data):
        """Get current gameweek number"""
        if not data or 'currentGameweek' not in data:
            return "1"
        return str(data['currentGameweek'])
    
    def create_background(self):
        """Create the background with gradient"""
        img = Image.new('RGB', (self.width, self.height), self.background_color)
        draw = ImageDraw.Draw(img)
        
        # Add some subtle patterns or gradients
        for i in range(0, self.height, 20):
            alpha = int(20 * (1 - i / self.height))
            draw.rectangle([0, i, self.width, i + 10], 
                         fill=(self.primary_color[0], self.primary_color[1], self.primary_color[2], alpha))
        
        return img, draw
    
    def add_header(self, draw, gameweek):
        """Add header with title and gameweek"""
        try:
            # Try to load a custom font, fallback to default
            try:
                title_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 48)
                subtitle_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 24)
            except:
                title_font = ImageFont.load_default()
                subtitle_font = ImageFont.load_default()
            
            # Main title
            title = "FPL Draft Dashboard"
            title_bbox = draw.textbbox((0, 0), title, font=title_font)
            title_width = title_bbox[2] - title_bbox[0]
            title_x = (self.width - title_width) // 2
            draw.text((title_x, 50), title, fill=self.text_color, font=title_font)
            
            # Subtitle
            subtitle = f"Gameweek {gameweek} • Live Standings"
            subtitle_bbox = draw.textbbox((0, 0), subtitle, font=subtitle_font)
            subtitle_width = subtitle_bbox[2] - subtitle_bbox[0]
            subtitle_x = (self.width - subtitle_width) // 2
            draw.text((subtitle_x, 110), subtitle, fill=self.secondary_text, font=subtitle_font)
            
        except Exception as e:
            print(f"Error adding header: {e}")
    
    def add_leaderboard(self, draw, leaderboard):
        """Add leaderboard table"""
        try:
            # Try to load fonts
            try:
                team_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 20)
                points_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 18)
                header_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 16)
            except:
                team_font = ImageFont.load_default()
                points_font = ImageFont.load_default()
                header_font = ImageFont.load_default()
            
            # Table position
            table_x = 100
            table_y = 200
            row_height = 40
            
            # Headers
            draw.text((table_x, table_y), "POS", fill=self.secondary_text, font=header_font)
            draw.text((table_x + 80, table_y), "TEAM", fill=self.secondary_text, font=header_font)
            draw.text((table_x + 500, table_y), "PTS", fill=self.secondary_text, font=header_font)
            draw.text((table_x + 600, table_y), "W-D-L", fill=self.secondary_text, font=header_font)
            draw.text((table_x + 700, table_y), "WINNINGS", fill=self.secondary_text, font=header_font)
            
            # Draw header line
            draw.line([(table_x, table_y + 25), (table_x + 800, table_y + 25)], 
                     fill=self.secondary_text, width=1)
            
            # Team rows
            for i, team in enumerate(leaderboard):
                y_pos = table_y + 35 + (i * row_height)
                
                # Position
                draw.text((table_x, y_pos), f"{i+1}.", fill=self.text_color, font=team_font)
                
                # Team name (truncate if too long)
                team_name = team.get('teamName', 'Unknown')[:20]
                draw.text((table_x + 80, y_pos), team_name, fill=self.text_color, font=team_font)
                
                # Points
                points = team.get('totalPoints', 0)
                draw.text((table_x + 500, y_pos), str(points), fill=self.text_color, font=points_font)
                
                # Record (W-D-L)
                wins = team.get('wins', 0)
                draws = team.get('draws', 0)
                losses = team.get('losses', 0)
                record = f"{wins}-{draws}-{losses}"
                draw.text((table_x + 600, y_pos), record, fill=self.text_color, font=points_font)
                
                # Winnings
                winnings = team.get('totalWinnings', 0)
                winnings_text = f"${winnings}" if winnings > 0 else "$0"
                color = self.accent_color if winnings > 0 else self.secondary_text
                draw.text((table_x + 700, y_pos), winnings_text, fill=color, font=points_font)
                
        except Exception as e:
            print(f"Error adding leaderboard: {e}")
    
    def add_weekly_winner(self, draw, weekly_winner):
        """Add weekly winner highlight"""
        try:
            try:
                winner_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 22)
                label_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 18)
            except:
                winner_font = ImageFont.load_default()
                label_font = ImageFont.load_default()
            
            # Weekly winner box
            box_x = 100
            box_y = 450
            box_width = 1000
            box_height = 80
            
            # Draw box background
            draw.rectangle([box_x, box_y, box_x + box_width, box_y + box_height], 
                         fill=(self.primary_color[0], self.primary_color[1], self.primary_color[2], 50))
            draw.rectangle([box_x, box_y, box_x + box_width, box_y + box_height], 
                         outline=self.primary_color, width=2)
            
            # Weekly winner text
            winner_text = f"🏆 Weekly Winner: {weekly_winner}"
            winner_bbox = draw.textbbox((0, 0), winner_text, font=winner_font)
            winner_width = winner_bbox[2] - winner_bbox[0]
            winner_x = box_x + (box_width - winner_width) // 2
            draw.text((winner_x, box_y + 25), winner_text, fill=self.text_color, font=winner_font)
            
        except Exception as e:
            print(f"Error adding weekly winner: {e}")
    
    def add_footer(self, draw):
        """Add footer with timestamp"""
        try:
            try:
                footer_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 14)
            except:
                footer_font = ImageFont.load_default()
            
            timestamp = datetime.now().strftime("%B %d, %Y at %I:%M %p")
            footer_text = f"Last updated: {timestamp}"
            
            footer_bbox = draw.textbbox((0, 0), footer_text, font=footer_font)
            footer_width = footer_bbox[2] - footer_bbox[0]
            footer_x = (self.width - footer_width) // 2
            draw.text((footer_x, self.height - 30), footer_text, fill=self.secondary_text, font=footer_font)
            
        except Exception as e:
            print(f"Error adding footer: {e}")
    
    def generate_image(self):
        """Generate the complete dynamic image"""
        # Load data
        data, gameweek = self.load_dashboard_data()
        if not data:
            print("No dashboard data found, using fallback")
            gameweek = "8"
            data = {}
        
        # Create background
        img, draw = self.create_background()
        
        # Add header
        self.add_header(draw, gameweek)
        
        # Add leaderboard
        leaderboard = self.get_leaderboard_data(data)
        if leaderboard:
            self.add_leaderboard(draw, leaderboard)
        
        # Add weekly winner
        weekly_winner = self.get_weekly_winner(data)
        self.add_weekly_winner(draw, weekly_winner)
        
        # Add footer
        self.add_footer(draw)
        
        return img
    
    def save_image(self, output_path="docs/fpl-dashboard-preview.png"):
        """Generate and save the dynamic image"""
        try:
            img = self.generate_image()
            img.save(output_path, "PNG", quality=95)
            print(f"✅ Dynamic image saved to {output_path}")
            return True
        except Exception as e:
            print(f"❌ Error saving image: {e}")
            return False

def main():
    """Main function to generate dynamic image"""
    generator = DynamicImageGenerator()
    success = generator.save_image()
    
    if success:
        print("🎉 Dynamic Open Graph image generated successfully!")
        print("📱 This image will now appear when you share the dashboard link on iMessage")
    else:
        print("❌ Failed to generate dynamic image")

if __name__ == "__main__":
    main()
