<?xml version="1.0" encoding="UTF-8"?>
<sml:SensorML xmlns:sml="http://www.opengis.net/sensorML/1.0.1" xmlns:swe="http://www.opengis.net/swe/1.0.1" xmlns:gml="http://www.opengis.net/gml" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.0.1">
  <sml:member>
    <sml:System>
      <!-- ======================================= -->
      <!--               Identifiers               -->
      <!-- ======================================= -->
      <sml:identification>
        <sml:IdentifierList>
          <sml:identifier name="uniqueID">
            <sml:Term definition="urn:ogc:def:identifier:OGC:1.0:uniqueID">
              <sml:value>http://shom.fr/maregraphie/procedure/37</sml:value>
            </sml:Term>
          </sml:identifier>
          <sml:identifier name="id_shom">
            <sml:Term definition="http://">
              <sml:value>37</sml:value>
            </sml:Term>
          </sml:identifier>
          <sml:identifier name="longName">
            <sml:Term definition="urn:ogc:def:identifier:OGC:1.0:longName">
              <sml:value>SAINT-NAZAIRE</sml:value>
            </sml:Term>
          </sml:identifier>
        </sml:IdentifierList>
      </sml:identification>
      <!-- ======================================= -->
      <!--               Classifiers               -->
      <!-- ======================================= -->
      <sml:classification>
        <sml:ClassifierList>
          <sml:classifier name="value">
            <sml:Term definition="http://shom.fr/maregraphie/id_shom">
              <sml:value>37</sml:value>
            </sml:Term>
          </sml:classifier>
          <sml:classifier name="label">
            <sml:Term definition="http://shom.fr/maregraphie/label">
              <sml:value>SAINT-NAZAIRE</sml:value>
            </sml:Term>
          </sml:classifier>
        </sml:ClassifierList>
      </sml:classification>
      <!-- ======================================= -->
      <!--            Constraints              -->
      <!-- =======================================  -->
      <sml:validTime>
        <gml:TimePeriod gml:id="documentValidTime">
          <gml:beginPosition>2050-01-01</gml:beginPosition>
          <gml:endPosition indeterminatePosition="now"/>
        </gml:TimePeriod>
      </sml:validTime>
      <sml:legalConstraint>
        <sml:Rights>
          <sml:documentation>
            <sml:Document>
              <gml:description>Voir les conditions générales d'utilisation sur l'espace de diffusion.</gml:description>
            </sml:Document>
          </sml:documentation>
        </sml:Rights>
      </sml:legalConstraint>
      <!-- ======================================= -->
      <!--            Characteristics              -->
      <!--            in capapabilities...         -->
      <!-- =======================================  -->
      <sml:capabilities name="characterics">
        <swe:DataRecord>
          <swe:field name="ville_d_hebergement">
            <swe:Text definition="http://shom.fr/maregraphie/ville_d_hebergement">
              <swe:value>Saint-Nazaire</swe:value>
            </swe:Text>
          </swe:field>
          <swe:field name="fuseau_horaire">
            <swe:Text definition="http://shom.fr/maregraphie/fuseau_horaire">
              <swe:value>0</swe:value>
            </swe:Text>
          </swe:field>
          <swe:field name="longitude">
            <swe:Quantity definition="http://shom.fr/maregraphie/longitude">
              <swe:value>-2.20155</swe:value>
            </swe:Quantity>
          </swe:field>
          <swe:field name="latitude">
            <swe:Quantity definition="http://shom.fr/maregraphie/latitude">
              <swe:value>47.266862</swe:value>
            </swe:Quantity>
          </swe:field>
          <swe:field name="sect_geographique">
            <swe:Text definition="http://shom.fr/maregraphie/sect_geographique">
              <swe:value>FH</swe:value>
            </swe:Text>
          </swe:field>
          <swe:field name="date_prem_obs">
            <swe:Category definition="http://shom.fr/maregraphie/date_prem_obs">
              <swe:value>1821-05-25</swe:value>
            </swe:Category>
          </swe:field>
          <swe:field name="descriptif_capteur">
            <swe:Text definition="http://shom.fr/maregraphie/descriptif_capteur">
              <swe:value>https://refmar.shom.fr/maregraphe-radar-ondes-guidees-optiflex-1300c</swe:value>
            </swe:Text>
          </swe:field>
          <swe:field name="collocalisation">
            <swe:Text definition="http://shom.fr/maregraphie/collocalisation">
              <swe:value>https://www.sonel.org/spip.php?page=gps&amp;idStation=3424</swe:value>
            </swe:Text>
          </swe:field>
          <swe:field name="etat_maregraphe">
            <swe:Text definition="http://shom.fr/maregraphie/etat_maregraphe">
              <swe:value>OK</swe:value>
            </swe:Text>
          </swe:field>
          <swe:field name="info_maregraphe">
            <swe:Text definition="http://shom.fr/maregraphie/info_maregraphe">
              <swe:value>https://refmar.shom.fr/donnees/37</swe:value>
            </swe:Text>
          </swe:field>
          <swe:field name="journal_de_bord">
            <swe:Text definition="http://shom.fr/maregraphie/journal_de_bord">
              <swe:value>https://refmar.shom.fr/donnees/37</swe:value>
            </swe:Text>
          </swe:field>
          <swe:field name="spm">
            <swe:Text definition="http://shom.fr/maregraphie/spm">
              <swe:value>SAINT-NAZAIRE</swe:value>
            </swe:Text>
          </swe:field>
          <swe:field name="zero_hydro">
            <swe:Text definition="http://shom.fr/maregraphie/zero_hydro">
              <swe:value>zero_hydrographique</swe:value>
            </swe:Text>
          </swe:field>
          <swe:field name="reseau">
            <swe:Text definition="http://shom.fr/maregraphie/reseau">
              <swe:value>RONIM</swe:value>
            </swe:Text>
          </swe:field>
          <swe:field name="id_ram">
            <swe:Text definition="http://shom.fr/maregraphie/id_ram">
              <swe:value>Saint-Nazaire</swe:value>
            </swe:Text>
          </swe:field>
          <swe:field name="link_ram">
            <swe:Text definition="http://shom.fr/maregraphie/link_ram">
              <swe:value>https://diffusion.shom.fr/donnees/references-verticales/references-altimetriques-maritimes-ram.html</swe:value>
            </swe:Text>
          </swe:field>
          <swe:field name="gestionnaire">
            <swe:Text definition="http://shom.fr/maregraphie/gestionnaire">
              <swe:value>Shom</swe:value>
            </swe:Text>
          </swe:field>
        </swe:DataRecord>
      </sml:capabilities>
      <!-- ================================= -->
      <!--            Capabilities           -->
      <!-- ================================= -->
      <sml:capabilities name="offerings">
        <swe:SimpleDataRecord>
          <swe:field name="Offering_for_sensor">
            <swe:Text definition="urn:ogc:def:identifier:OGC:offeringID">
              <swe:value>http://shom.fr/maregraphie/offering/37</swe:value>
            </swe:Text>
          </swe:field>
        </swe:SimpleDataRecord>
      </sml:capabilities>
      <sml:capabilities name="featuresOfInterest">
        <swe:SimpleDataRecord>
          <swe:field name="featureOfInterestID">
            <swe:Text>
              <swe:value>http://shom.fr/maregraphie/featureOfInterest/37</swe:value>
            </swe:Text>
          </swe:field>
        </swe:SimpleDataRecord>
      </sml:capabilities>
      <sml:capabilities name="organisme">
        <swe:DataRecord definition="http://shom.fr/maregraphie/organisme">
          
          <swe:field name="Shom">
            <swe:DataRecord definition="http://shom.fr/maregraphie/organisme">
              <swe:field name="nom">
                <swe:Text definition="http://shom.fr/maregraphie/nom_organisme">
                  <swe:value>Shom</swe:value>
                </swe:Text>
              </swe:field>
              <swe:field name="logo">
                <swe:Text definition="http://shom.fr/maregraphie/logo">
                  <swe:value>https://services.data.shom.fr/static/logo/DDM/logo_SHOM.png</swe:value>
                </swe:Text>
              </swe:field>
              <swe:field name="URL">
                <swe:Text definition="http://shom.fr/maregraphie/lien">
                  <swe:value>https://www.shom.fr</swe:value>
                </swe:Text>
              </swe:field>
            </swe:DataRecord>
          </swe:field>
          <swe:field name="GPM Nantes Saint-Nazaire">
            <swe:DataRecord definition="http://shom.fr/maregraphie/organisme">
              <swe:field name="nom">
                <swe:Text definition="http://shom.fr/maregraphie/nom_organisme">
                  <swe:value>GPM Nantes Saint-Nazaire</swe:value>
                </swe:Text>
              </swe:field>
              <swe:field name="logo">
                <swe:Text definition="http://shom.fr/maregraphie/logo">
                  <swe:value>https://services.data.shom.fr/static/logo/DDM/logo_GPM_Nantes_Saint-Nazaire.png</swe:value>
                </swe:Text>
              </swe:field>
              <swe:field name="URL">
                <swe:Text definition="http://shom.fr/maregraphie/lien">
                  <swe:value>https://www.nantes.port.fr/</swe:value>
                </swe:Text>
              </swe:field>
            </swe:DataRecord>
          </swe:field>
          
        </swe:DataRecord>
      </sml:capabilities>
      <!-- ============================ -->
      <!--           Contacts           -->
      <!-- ============================ -->
      
      <sml:contact>
        <sml:ContactList>
          <sml:member>
            <sml:ResponsibleParty>
              <sml:individualName>SHOM</sml:individualName>
              <sml:organizationName>SHOM</sml:organizationName>
              <sml:contactInfo>
                <sml:phone>
                  <sml:voice>02 56 31 24 26</sml:voice>
                </sml:phone>
                <sml:address>
                  <sml:deliveryPoint>13 rue du chatellier</sml:deliveryPoint>
                  <sml:city>BREST</sml:city>
                  <sml:postalCode>29200</sml:postalCode>
                  <sml:country>France</sml:country>
                  <sml:electronicMailAddress>refmar[arobase]shom.fr</sml:electronicMailAddress>
                </sml:address>
                <sml:onlineResource xlink:href="http://shom.fr/maregraphie"/>
              </sml:contactInfo>
            </sml:ResponsibleParty>
          </sml:member>
        </sml:ContactList>
      </sml:contact>
      
      <!-- ============================ -->
      <!--         Documentation        -->
      <!-- ============================ -->
      <!-- ============================ -->
      <!--            Position          -->
      <!-- ============================ -->
      <sml:position name="sensorPosition">
        <swe:Position fixed="true" referenceFrame="urn:ogc:def:crs:EPSG::4326">
          <swe:location>
            <swe:Vector gml:id="STATION_LOCATION">
              <swe:coordinate name="latitude">
                <swe:Quantity axisID="x">
                  <swe:uom code="degree"/>
                  <swe:value>47.266862</swe:value>
                </swe:Quantity>
              </swe:coordinate>
              <swe:coordinate name="longitude">
                <swe:Quantity axisID="y">
                  <swe:uom code="degree"/>
                  <swe:value>-2.20155</swe:value>
                </swe:Quantity>
              </swe:coordinate>
            </swe:Vector>
          </swe:location>
        </swe:Position>
      </sml:position>
      <!-- =============================== -->
      <!--              Inputs             -->
      <!-- =============================== -->
      <sml:inputs>
        <sml:InputList>
          <sml:input name="observedProperty_WaterHeight">
            <swe:ObservableProperty definition="http://shom.fr/maregraphie/observedProperty/WaterHeight"/>
          </sml:input>
        </sml:InputList>
      </sml:inputs>
      <!-- =============================== -->
      <!--              Outputs            -->
      <!-- =============================== -->
      <sml:outputs>
        <sml:OutputList>
          <sml:output name="observedProperty_WaterHeight_1">
            <swe:Count definition="http://shom.fr/maregraphie/observedProperty/WaterHeight/1"/>
          </sml:output>
          <sml:output name="observedProperty_WaterHeight_2">
            <swe:Count definition="http://shom.fr/maregraphie/observedProperty/WaterHeight/2"/>
          </sml:output>
          <sml:output name="observedProperty_WaterHeight_3">
            <swe:Count definition="http://shom.fr/maregraphie/observedProperty/WaterHeight/3"/>
          </sml:output>
          <sml:output name="observedProperty_WaterHeight_4">
            <swe:Count definition="http://shom.fr/maregraphie/observedProperty/WaterHeight/4"/>
          </sml:output>
          <sml:output name="observedProperty_WaterHeight_5">
            <swe:Count definition="http://shom.fr/maregraphie/observedProperty/WaterHeight/5"/>
          </sml:output>
          <sml:output name="observedProperty_WaterHeight_6">
            <swe:Count definition="http://shom.fr/maregraphie/observedProperty/WaterHeight/6"/>
          </sml:output>
        </sml:OutputList>
      </sml:outputs>
      <!-- =============================== -->
      <!--              History            -->
      <!-- =============================== -->
      <sml:history xlink:title="observatory_logbook_events">
        <sml:EventList>
          <sml:member name="logbook-2024-03-20">
            <sml:Event>
              <sml:date>2024-03-21T09:24:29.000Z</sml:date>
              <gml:description>Manipulation sur l&apos;&apos;observatoire réalisé par notre partenaire, le GPM de Nantes Saint-Nazaire ayant provoqué une interruption temporaire de la diffusion des données.</gml:description>
            </sml:Event>
          </sml:member>
          <sml:member name="logbook-2011-03-08">
            <sml:Event>
              <sml:date>2011-07-21T13:41:05.000Z</sml:date>
              <gml:description>
	Changement du coefficient d à 10:43.
</gml:description>
            </sml:Event>
          </sml:member>
          <sml:member name="logbook-2011-01-10">
            <sml:Event>
              <sml:date>2011-07-21T13:41:03.000Z</sml:date>
              <gml:description>
	Relance du MCN et archivage des données.
</gml:description>
            </sml:Event>
          </sml:member>
          <sml:member name="logbook-2010-11-19">
            <sml:Event>
              <sml:date>2011-07-21T13:41:02.000Z</sml:date>
              <gml:description>
	Liaison téléphonique rétablie. Récupération des données OK.
</gml:description>
            </sml:Event>
          </sml:member>
          <sml:member name="logbook-2007-02-01">
            <sml:Event>
              <sml:date>2011-07-26T09:10:04.000Z</sml:date>
              <gml:description>
	Du 18 au 19 et du 22 au 24 janvier 2007, deux techniciens du SHOM se sont rendus sur place pour procéder à l&apos;installation du système MCN. Le MCN est installé dans un local marégraphique contenant un puits de tranquillisation et est composé d&apos;un télémètre radar Optiflex et d&apos;une centrale d&apos;acquisition Marelta.
</gml:description>
            </sml:Event>
          </sml:member>
          <sml:member name="logbook-2013-09-18">
            <sml:Event>
              <sml:date>2013-10-15T09:54:01.000Z</sml:date>
              <gml:description>
	Controle à la sonde lumineuse :

	Moyenne des écarts à BM :1.51cm  (écart type : 0.09 cm)

	Moyenne des écarts à PM : 0.6 cm (écart type : 0.32 cm)
</gml:description>
            </sml:Event>
          </sml:member>
          <sml:member name="logbook-2012-11-08">
            <sml:Event>
              <sml:date>2012-11-08T15:58:01.000Z</sml:date>
              <gml:description>
	Suite à un problème technique, les données brutes fournies par le marégraphe de Saint-Nazaire ne sont pas disponibles entre 03h00 et 15h30 (TU).

	Néanmoins, les données ont été enregistrées. Dès que possible, elles seront mises en ligne comme données validées (à pas de temps de 10 minutes et horaire). 
</gml:description>
            </sml:Event>
          </sml:member>
          <sml:member name="logbook-2012-10-16">
            <sml:Event>
              <sml:date>2012-10-19T14:06:05.000Z</sml:date>
              <gml:description>
	Controle à la sonde lumineuse effectué ce jour.

	Résultats :

	Moyenne des écarts à BM : 2.76 cm (écart type : 0.18)

	Moyenne des écarts à PM : 0.93 cm (écart type : 0.38)
</gml:description>
            </sml:Event>
          </sml:member>
          <sml:member name="logbook-2013-02-12">
            <sml:Event>
              <sml:date>2013-02-20T13:21:00.000Z</sml:date>
              <gml:description>
	Contrôles à la sonde lumineuse effectués ce jour.

	Résultats :

	Moyenne des écarts à BM : 1.58 cm (écart type : 0.25).

	Moyenne des écarts à PM : 0.43 cm (écart type : 1.22).
</gml:description>
            </sml:Event>
          </sml:member>
          <sml:member name="logbook-2012-01-17">
            <sml:Event>
              <sml:date>2012-02-27T13:36:05.000Z</sml:date>
              <gml:description>
	Problème lors de la relance, il manque plusieurs mesures le 17/01/2012.

	Suppression des données du 11/01/2012 au 13/01/2012 : données aberrantes
</gml:description>
            </sml:Event>
          </sml:member>
          <sml:member name="logbook-2014-04-15">
            <sml:Event>
              <sml:date>2014-05-16T13:38:04.000Z</sml:date>
              <gml:description>
	Contrôle à la sonde lumineuse effectué ce jour.

	Résultats :

	Moyenne des écarts à BM : 1.87 cm (écart type :  0.15 cm)

	Moyenne des écarts à PM :  0.02 cm ( écart type :  0.98 cm)
</gml:description>
            </sml:Event>
          </sml:member>
          <sml:member name="logbook-2011-05-30">
            <sml:Event>
              <sml:date>2011-07-21T13:42:00.000Z</sml:date>
              <gml:description>
	Relance du MCN et archivage des données.
</gml:description>
            </sml:Event>
          </sml:member>
          <sml:member name="logbook-2010-11-15">
            <sml:Event>
              <sml:date>2011-07-21T13:42:01.000Z</sml:date>
              <gml:description>
	Impossible d&apos;interroger le MCN depuis 03/11/2010. La société qui gère le faisceau hertzien doit intervenir semaine 46.
</gml:description>
            </sml:Event>
          </sml:member>
          <sml:member name="logbook-2014-11-07">
            <sml:Event>
              <sml:date>2015-02-05T15:24:01.000Z</sml:date>
              <gml:description>
	Controle à la sonde lumineuse effectué ce jour.

	Moyenne des écarts à BM : 1.06 cm (écart type : 0.37 cm)

	Moyenne des écarts à PM : 0.76 cm (écart type : 0.44 cm)
</gml:description>
            </sml:Event>
          </sml:member>
          <sml:member name="logbook-2015-01-21">
            <sml:Event>
              <sml:date>2015-02-06T11:40:02.000Z</sml:date>
              <gml:description>
	Controle à la sonde lumineuse effectué ce jour.

	 

	Moyenne des écarts à BM : 1.56 cm (écart type : 0.13)

	Moyenne des écarts à PM : -1.56 cm (écart type : 1.37)
</gml:description>
            </sml:Event>
          </sml:member>
          <sml:member name="logbook-2014-09-10">
            <sml:Event>
              <sml:date>2015-01-30T14:56:02.000Z</sml:date>
              <gml:description>
	Controle à la sonde lumineuse effectué ce jour.

	Moyenne des écarts à BM : 4.33cm (écart type : 0.46 cm)

	Moyenne des écarts à PM : 1.11 cm (écart type : 0.07cm)
</gml:description>
            </sml:Event>
          </sml:member>
          <sml:member name="logbook-2010-09-01">
            <sml:Event>
              <sml:date>2011-07-05T13:17:03.000Z</sml:date>
              <gml:description>
	Relance du MCN. Archivage des données.
	Il manque les données du 29/03/2010 de 11h30z à 13h10z
</gml:description>
            </sml:Event>
          </sml:member>
          <sml:member name="logbook-2010-10-08">
            <sml:Event>
              <sml:date>2011-07-05T13:18:01.000Z</sml:date>
              <gml:description>
	Réparation du puits effectué, reprise de l&apos;acquisition.
</gml:description>
            </sml:Event>
          </sml:member>
          <sml:member name="logbook-2010-10-01">
            <sml:Event>
              <sml:date>2011-07-05T13:17:05.000Z</sml:date>
              <gml:description>
	Arrêt de l&apos;acquisition depuis le 01/10/2010. Le tube de tranquillisation s&apos;est détaché (corrosion), intervention prévue semaine 40.
</gml:description>
            </sml:Event>
          </sml:member>
          <sml:member name="logbook-2009-07-30">
            <sml:Event>
              <sml:date>2011-07-05T13:15:05.000Z</sml:date>
              <gml:description>
	Problèmes de connection - Les données n&apos;ont plus été récupérées automatiquement depuis le 12/07/09.
	L&apos;interrogation manuelle est également impossible, pas de réponse du marégraphe. Nos partenaires ont été mis au courant de ce problème et doivent intervenir prochainement.
</gml:description>
            </sml:Event>
          </sml:member>
          <sml:member name="logbook-2010-02-17">
            <sml:Event>
              <sml:date>2011-07-05T13:17:01.000Z</sml:date>
              <gml:description>
	Relance du MCN. Archivage des données. Manque des données du 18/01/2010 au 19/01/2010 suite au changement du tube effectué par nos partenaires. Manque des données du 23/01/2010 12:20 au 23/01/2010 23:50 suite à un problème inexpliqué.
</gml:description>
            </sml:Event>
          </sml:member>
          <sml:member name="logbook-2009-12-17">
            <sml:Event>
              <sml:date>2011-07-05T13:16:05.000Z</sml:date>
              <gml:description>
	Plantage de la centrale. Manque quelques données du 15/12/09 16:30 au 15/12/09 23:50.
</gml:description>
            </sml:Event>
          </sml:member>
          <sml:member name="logbook-2009-11-26">
            <sml:Event>
              <sml:date>2011-07-05T13:16:03.000Z</sml:date>
              <gml:description>
	Relance du MCN.
	Archivage des données à 10 min et HH.
</gml:description>
            </sml:Event>
          </sml:member>
          <sml:member name="logbook-2009-08-03">
            <sml:Event>
              <sml:date>2011-07-05T13:16:02.000Z</sml:date>
              <gml:description>
	Retour de la connection - Nos partenaires sont intervenus, et ont permis de rétablir la connexion au marégraphe.
	Les données sont de nouveau disponibles.
</gml:description>
            </sml:Event>
          </sml:member>
          <sml:member name="logbook-2011-07-05">
            <sml:Event>
              <sml:date>2011-07-05T13:04:01.000Z</sml:date>
              <gml:description>
	Les données validées jusqu&apos;au 30 mai 2011 sont disponibles sur le serveur FTP.
</gml:description>
            </sml:Event>
          </sml:member>
          <sml:member name="logbook-2018-08-01">
            <sml:Event>
              <sml:date>2018-08-02T10:36:04.000Z</sml:date>
              <gml:description>Problème avec la ligne RTC support du marégraphe et donc de la communication ADSL. Des investigations sont en cours avec notre partenaire local.</gml:description>
            </sml:Event>
          </sml:member>
          <sml:member name="logbook-2018-08-07">
            <sml:Event>
              <sml:date>2018-08-08T16:43:11.000Z</sml:date>
              <gml:description>Intervention du fournisseur d&apos;accès sur la ligne téléphonique</gml:description>
            </sml:Event>
          </sml:member>
          <sml:member name="logbook-2018-11-26">
            <sml:Event>
              <sml:date>2018-11-26T18:35:58.000Z</sml:date>
              <gml:description>Erreur de transmission de données temps réel : données accessibles en différé entre le 26/11 et le 27/11</gml:description>
            </sml:Event>
          </sml:member>
          <sml:member name="logbook-2019-02-21">
            <sml:Event>
              <sml:date>2019-02-21T10:44:59.000Z</sml:date>
              <gml:description>Erreur serveur Shom entre le 20/02/19 et le 21/02/19 : les données 1 minute n&apos;ont pas été reçues </gml:description>
            </sml:Event>
          </sml:member>
          <sml:member name="logbook-2020-01-21">
            <sml:Event>
              <sml:date>2020-01-23T13:57:15.000Z</sml:date>
              <gml:description>Coupure de liaison entre le 20/01/2020 et le 22/01/2020 : seules les données temps différé sont disponibles</gml:description>
            </sml:Event>
          </sml:member>
          <sml:member name="logbook-2020-03-13">
            <sml:Event>
              <sml:date>2020-03-28T00:28:07.000Z</sml:date>
              <gml:description>1-2 Ajout de données :
1/ Brutes tps diff : toutes mesures depuis 1996
2/ Validées tps diff : mesures validées depuis 1996 uniquement
3/ Validées horaires : données calculées par le Shom (log. TDB) à partir des données &quot; Validées temps différé &quot;</gml:description>
            </sml:Event>
          </sml:member>
          <sml:member name="logbook-2020-03-28">
            <sml:Event>
              <sml:date>2020-03-28T00:28:38.000Z</sml:date>
              <gml:description>2-2 Pour plus d&apos;infos sur les ajustements, la validation et le travail de reconstruction des données anciennes :  http://refmar.shom.fr/applications_maregraphiques/programmes-projets/construction-analyse-series-coherentes-niveau-mer/port-de-saint-nazaire</gml:description>
            </sml:Event>
          </sml:member>
          <sml:member name="logbook-2019-06-27">
            <sml:Event>
              <sml:date>2019-06-27T09:56:29.000Z</sml:date>
              <gml:description>Données temps réelles manquantes entre 26/06/2019 et 27/06/2019 suite à une panne réseau</gml:description>
            </sml:Event>
          </sml:member>
          <sml:member name="logbook-2021-10-18">
            <sml:Event>
              <sml:date>2021-10-18T14:23:36.000Z</sml:date>
              <gml:description>Travaux d&apos;entretien ce jour.</gml:description>
            </sml:Event>
          </sml:member>
          <sml:member name="logbook-2024-09-03">
            <sml:Event>
              <sml:date>2024-09-04T09:08:27.000Z</sml:date>
              <gml:description>Soucis électrique au niveau de l&apos;&apos;observatoire marégraphique en raison d&apos;&apos;un soucis avec la batterie de secours. 
Une équipe du Shom remplacera la batterie la semaine prochaine.</gml:description>
            </sml:Event>
          </sml:member>
          <sml:member name="logbook-2024-09-09">
            <sml:Event>
              <sml:date>2024-09-18T08:17:53.000Z</sml:date>
              <gml:description>Remplacement de la batterie par une équipe du Shom. Fonctionnement nominal de l&apos;&apos;observatoire marégraphique.
Les données manquantes du 3 au 9 septembre ont été récupérées.
L&apos;&apos;observatoire est en bon état..</gml:description>
            </sml:Event>
          </sml:member>

        </sml:EventList>
      </sml:history>
    </sml:System>
  </sml:member>
</sml:SensorML>
