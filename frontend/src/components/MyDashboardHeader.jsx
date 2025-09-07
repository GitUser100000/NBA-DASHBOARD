import MyBackButton from "./MyBackButton"

export default function MyDashboardHeader({ headerData }) {
  return (
    <div>
      {/* <MyBackButton /> */}
      <div className="dashboard">
          <img src={headerData.homeLogo} className="team-logo"/>
          <div id="title">
            <h1>{`${headerData.homeTeam} vs ${headerData.awayTeam}`}</h1>
          </div>
          <img src={headerData.awayLogo} className="team-logo"/>
      </div>
      <p>{headerData.location} - {headerData.state}</p>
    </div>
  )
}