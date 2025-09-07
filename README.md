# NBA Tracker App

A modern, responsive web application for tracking NBA games, player statistics, and live scores. Built with React frontend and Flask backend, featuring real-time data from the NBA API.

![NBA Tracker](https://img.shields.io/badge/NBA-Tracker-orange?style=for-the-badge&logo=basketball)
![React](https://img.shields.io/badge/React-19.1.0-blue?style=for-the-badge&logo=react)
![Flask](https://img.shields.io/badge/Flask-2.0+-green?style=for-the-badge&logo=flask)
![Vite](https://img.shields.io/badge/Vite-7.0.4-purple?style=for-the-badge&logo=vite)

## 🏀 Features

### Game Management
- **Date Picker**: Select any date to view NBA games
- **Game Selection**: Browse and select from available games
- **Live Scores**: Real-time score updates during games
- **Game Status**: Current quarter, time remaining, and final scores

### Player Analytics
- **Player Cards**: Detailed player information with headshots
- **Statistics Display**: Comprehensive box score stats for each player
- **Starter/Bench Status**: Clear indication of player roles
- **Team Rosters**: Complete team lineups with player details

### Modern UI/UX
- **NBA-Themed Design**: Dark theme with orange/blue NBA color scheme
- **Responsive Layout**: Optimized for desktop and mobile devices
- **Glass Morphism**: Modern UI with backdrop blur effects
- **Smooth Animations**: Polished user interactions and transitions

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- Python 3.8+
- pip (Python package manager)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nba_tracker
   ```

2. **Backend Setup**
   ```bash
   cd backend
   pip install -r requirements.txt
   python app.py
   ```
   The Flask server will start on `http://localhost:5000`

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   The React app will start on `http://localhost:5173`

4. **Access the Application**
   Open your browser and navigate to `http://localhost:5173`

## 🏗️ Project Structure

```
nba_tracker/
├── backend/                 # Flask API server
│   ├── app.py              # Main Flask application
│   ├── server.py           # Production server configuration
│   ├── requirements.txt    # Python dependencies
│   └── _api_dumps/         # Sample API responses
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # Reusable React components
│   │   ├── pages/          # Main application pages
│   │   ├── api/            # API integration
│   │   └── App.jsx         # Main application component
│   ├── public/             # Static assets
│   └── package.json        # Node.js dependencies
└── README.md
```

## 🧩 Components

### Core Components
- **MyGamePicker**: Displays available games for selected date
- **MyGameCard**: Individual game information card
- **MyDashboardHeader**: Game header with team logos and info
- **MyScoreboard**: Live score display
- **MyPlayerList**: Team roster with player statistics
- **MyPlayerCard**: Individual player information
- **MyDatePicker**: Date selection component

### Pages
- **GamePickerPage**: Main landing page for game selection
- **GameDashboard**: Detailed game view with player stats

## 🔌 API Endpoints

### Backend API
- `GET /games?date=YYYY-MM-DD` - Fetch games for a specific date
- `GET /box-score/<game_id>` - Get detailed game statistics
- `GET /player-info/<player_id>` - Get player headshot URL

### Data Sources
- **NBA Official API**: Real-time game data and statistics
- **NBA CDN**: Player headshots and team logos

## 🎨 Styling

The application features a modern NBA-themed design with:
- **Color Scheme**: Dark backgrounds with NBA orange (#ff6b35) and blue accents
- **Typography**: Roboto font family for clean readability
- **Layout**: CSS Grid and Flexbox for responsive design
- **Effects**: Glass morphism, gradients, and smooth transitions

## 🛠️ Development

### Available Scripts

**Frontend:**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

**Backend:**
- `python app.py` - Start Flask development server
- `python server.py` - Start production server

### Key Dependencies

**Frontend:**
- React 19.1.0
- React Router DOM 7.8.0
- React DatePicker 8.5.0
- Axios 1.11.0
- Vite 7.0.4

**Backend:**
- Flask
- nba_api
- requests
- flask-cors

## 📱 Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- NBA API for providing comprehensive basketball data
- React team for the amazing frontend framework
- Flask team for the lightweight Python web framework
- All contributors and testers

## 📞 Support

If you encounter any issues or have questions, please:
1. Check the [Issues](https://github.com/your-repo/issues) page
2. Create a new issue with detailed information
3. Contact the development team

---

**Made with ❤️ for NBA fans everywhere**