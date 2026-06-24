try{
  docker compose up --build
}catch{
  Write-Host 'Ensure Docker Desktop is installed and running.'
}
