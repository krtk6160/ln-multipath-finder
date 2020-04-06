# ln-multipath-finder

## Instructions

1. Clone the repo and run `npm i`
2. Modify `pathToCert` and `pathToMacaroon` variables in `index.js` with absolute paths of your `tls.cert` and `admin.macaroon` files.
3. Unlock your wallet using `lncli unlock`
4. Test server status by running
  ```
  curl -X GET \
    http://localhost:3000/getFees \
    -H 'Content-Type: application/json'
  }'
  ```
  5. Call `getFees` endpoint by running
  ```
  curl -X GET \
  http://localhost:3000/getFees \
  -H 'Content-Type: application/json' \  
  -d '{
	"otherNode": "dest_node_pubkey",
	"numResult": num_path_to_find
}'
  ```
