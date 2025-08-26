import MyBackButton from "./MyBackButton"

export default function MyDashboardHeader({ headerData }) {
  return (
    <div>
      <MyBackButton />
      <div>
        <img src={headerData.homeLogo}/>
        <h1>{`${headerData.homeTeam} vs ${headerData.awayTeam}`}</h1>
        <img src={headerData.awayLogo}/>
      </div>
      <div>
        <p>{headerData.location} - {headerData.state}</p>
      </div>
    </div>
  )
}