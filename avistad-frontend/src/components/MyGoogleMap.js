import React, { Component } from 'react';
import GoogleMapReact from 'google-map-react';
import styled from 'styled-components';
import AutoComplete from './Autocomplete';
import Marker from './Marker';
import Button from './Button';
import Link from './Link';

const Wrapper = styled.main`
    width: 100%;
    height: 100%;
`;

class MyGoogleMap extends Component {
    state = {
        mapApiLoaded: false,
        mapInstance: null,
        mapApi: null,
        geoCoder: null,
        places: [],
        center: [],
        zoom: 9,
        address: '',
        draggable: true,
        lat: null,
        lng: null,
        link: '',
        url: '',
        startingLocations: [],
        destinationLocations: []
    };

    componentWillMount() {
        this.setCurrentLocation();
    }

    onMarkerInteraction = (childKey, childProps, mouse) => {
        this.setState({
            draggable: false,
            lat: mouse.lat,
            lng: mouse.lng
        });
    }

    onMarkerInteractionMouseUp = (childKey, childProps, mouse) => {
        this.setState({ draggable: true });
        this._generateAddress();
    }

    _onChange = ({ center, zoom }) => {
        this.setState({
            center: center,
            zoom: zoom
        });
    }

    _onClick = (value) => {
        this.setState({
            lat: value.lat,
            lng: value.lng
        });
    }

    apiHasLoaded = (map, maps) => {
        this.setState({
            mapApiLoaded: true,
            mapInstance: map,
            mapApi: maps
        });

        this._generateAddress();
        this.recoverInstance();
        this.getShareableLink();
    };

    recoverInstance = async () => {
        if (window.location.pathname !== '/') {
            // not at root path, could be a previous instance
            await fetch(window.location.pathname, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            }).then((response) => {
                return response.json();
            }).then((result) => {
                console.log("[*] Checking if previousInstance === true...");
                console.log(result);
                if (result["previousInstance"] === true) {
                    // recover the previous instance 
                    console.log("[*] previousInstance === true!!!");
                    const startingLocations = result["startingLocations"]
                    const destinationLocations = result["destinationLocations"]
    
                    console.log("startingLocations: ", startingLocations);
                    console.log("destinationLocations: ", destinationLocations);

                    this.setState({
                        startingLocations: startingLocations,
                        destinationLocations: destinationLocations
                    });
                }
            }).catch((error) => {
                console.log('[-] Error: ', error);
            });
        }
    }

    addPlace = (place) => {
        this.setState({
            places: [place],
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
        });

        this._generateAddress();
    };

    _generateAddress() {
        const {
            mapApi
        } = this.state;

        const geocoder = new mapApi.Geocoder;

        geocoder.geocode({ 'location': { lat: this.state.lat, lng: this.state.lng } }, (results, status) => {
            if (status === 'OK') {
                if (results[0]) {
                    this.zoom = 12;
                    this.setState({ address: results[0].formatted_address });
                } else {
                    window.alert('That address could not be found.');
                }
            } else {
                window.alert('Geocoder failed due to: ' + status);
            }
        });
    }

    setCurrentLocation() {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition((position) => {
                this.setState({
                    center: [position.coords.latitude, position.coords.longitude],
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
            });
        }
    }
    
    addStartingLocation = (address, lat, lng) => {
        this.setState({ 
            startingLocations: [
                ...this.state.startingLocations,
                {
                    address: address,
                    latitude: lat,
                    longitude: lng
                }
            ] 
        }, this.synchronizeStartingLocationsWithDatabase);
    }

    synchronizeStartingLocationsWithDatabase = async () => {
        console.log("[*] Starting locations: ", this.state.startingLocations);

        // send the most recently added location
        const location = this.state.startingLocations[this.state.startingLocations.length - 1]

        await fetch('/synchronize', {
            method: 'POST',
            cache: 'no-cache',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ link: this.state.link,
                                   startingLocation: location })
        })
        .then((response) => {
            console.log('Finished API call: ', response);
        }).catch((error) => {
            console.log('[-] Error: ', error);
        });
    }

    addDestinationLocation = (address, lat, lng) => {
        this.setState({ 
            destinationLocations: [
                ...this.state.destinationLocations,
                {
                    address: address,
                    latitude: lat,
                    longitude: lng
                }
            ] 
        }, this.synchronizeDestinationLocationsWithDatabase);
    }

    synchronizeDestinationLocationsWithDatabase = async () => {
        console.log("[*] Destination locations: ", this.state.destinationLocations);

        // send the most recently added location
        const location = this.state.destinationLocations[this.state.destinationLocations.length - 1]

        await fetch('/synchronize', {
            method: 'POST',
            cache: 'no-cache',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ link: this.state.link,
                                   destinationLocation: location })
        })
        .then((response) => {
            console.log('Finished API call: ', response);
        }).catch((error) => {
            console.log('[-] Error: ', error);
        });
    }

    getShareableLink = () => {
        if (window.location.pathname === '/' && this.state.link === '') {
            // generate new shareable instance link
            const base64 = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/";
            var newLink = "";
            for (var i = 0; i < 8; i += 1) {
                newLink += base64[Math.floor(Math.random() * base64.length)]
            }

            this.setState({ link: newLink });
        } else {
            const newLink = window.location.pathname.slice(1);
            this.setState({ link: newLink});   
        }
    }

    showShareableLink = () => {
        const newURL = 'https://avistad.com/' + this.state.link;

        this.setState({ url: newURL });
    }

    render() {
        const {
            places, mapApiLoaded, mapInstance, mapApi
        } = this.state;

        return (
            <Wrapper>
                {mapApiLoaded && (
                    <div>
                        <AutoComplete map={mapInstance} mapApi={mapApi} addplace={this.addPlace} />
                    </div>
                )}
                <GoogleMapReact
                    center={this.state.center}
                    zoom={this.state.zoom}
                    draggable={this.state.draggable}
                    onChange={this._onChange}
                    onChildMouseDown={this.onMarkerInteraction}
                    onChildMouseUp={this.onMarkerInteractionMouseUp}
                    onChildMouseMouve={this.onMarkerInteraction}
                    onChildClick={() => console.log('child click')}
                    onClick={this._onClick}
                    bootstrapURLKeys={{
                        key: 'AIzaSyAwu5e4u7rC2HaL_TPqRmU2GZwTOh5IfWs',
                        libraries: ['places', 'geometry']
                    }}
                    yesIWantToUseGoogleMapApiInternals
                    onGoogleApiLoaded={({ map, maps }) => this.apiHasLoaded(map, maps)}
                >
                    {this.state.startingLocations.map((startingLocation, id) => {
                        return <Marker
                                key={id}
                                text={startingLocation.address}
                                lat={startingLocation.latitude}
                                lng={startingLocation.longitude}/>
                    })}
                    {this.state.destinationLocations.map((destinationLocation, id) => {
                        return <Marker
                                key={id}
                                text={destinationLocation.address}
                                lat={destinationLocation.latitude}
                                lng={destinationLocation.longitude}/>
                    })}
                    <Marker
                     text={this.state.address}
                     lat={this.state.lat}
                     lng={this.state.lng}/>
                </GoogleMapReact>
                <div className="info-wrapper">
                    <div className="map-details">Latitude: <span>{this.state.lat}</span>, Longitude: <span>{this.state.lng}</span></div>
                    <div className="map-details">Zoom: <span>{this.state.zoom}</span></div>
                    <div className="map-details">Address: <span>{this.state.address}</span></div>
                </div>
                <div>
                    <Button text={"Add Starting Location"} onClick={() => this.addStartingLocation(this.state.address, this.state.lat, this.state.lng)}/>
                    <Button text={"Add Destination Location"} onClick={() => this.addDestinationLocation(this.state.address, this.state.lat, this.state.lng)}/>
                    <Button text={"Show Shareable Link"} onClick={() => this.showShareableLink()}/>
                    <Link text={this.state.url} onClick={() => navigator.clipboard.writeText(this.state.url)}/>
                </div>
            </Wrapper>
        );
    }
}

export default MyGoogleMap;