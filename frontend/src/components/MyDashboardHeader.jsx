import MyBackButton from "./MyBackButton"

export default function MyDashboardHeader({ headerData }) {
  return (
    <div className="dashboard">
      <MyBackButton />

        <img src={headerData.homeLogo} width="200px"/>
        <h1>{`${headerData.homeTeam} vs ${headerData.awayTeam}`}</h1>
        <img src={headerData.awayLogo}  width="200px"/>
 

        <p>{headerData.location} - {headerData.state}</p>
 
    </div>
  )
}