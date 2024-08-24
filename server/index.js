const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const multer  = require('multer');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const crypto = require('crypto'); 



const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/'); 
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname); 
    }
  });

// Generate a secure random string for session secret
const sessionSecret = crypto.randomBytes(32).toString('hex');
  
  const upload = multer({ storage: storage });
    const app = express()
    app.use(cors())
    app.use(express.json())
    app.use(bodyParser.json());
    app.use(cookieParser());

    app.use(session({
      secret: '2156', 
      resave: false,
      saveUninitialized: true,
      cookie: { secure: false } 
    }));

const PORT = process.env.PORT || 3000

//schema of Restaurants
const schemaData = mongoose.Schema({
    name : String,
    location: String,
    resaurant_mobile: Number,
    owner_mobile: Number,
    restaurant_type: String,
    opening_hours: String,
    closing_hours: String,
    imageURL: String,
    ratings: []
},{
    strict: true, timestamps: true, versionKey: false 
})
const userModel = mongoose.model("restaurant",schemaData)


//Scheema of Review
const ratingsSchema = mongoose.Schema({
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'restaurant' },
    user : String,
    rating : Number
}, {
    strict: true, timestamps: true, versionKey: false
});
const ratingsModel = mongoose.model('ratings', ratingsSchema);


// Schema for User
const userSchema = mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String},
});
const loginForm = mongoose.model("user", userSchema);


const PAGE_SIZE = 100; 



//give ratings
app.post("/add-ratings/:restaurantId", async (req, res) => {
    try {
        const { user, rating } = req.body;
        const restaurantId = req.params.restaurantId;

        const restaurant = await userModel.findById(restaurantId);
        if (!restaurant) {
            return res.status(404).json({ success: false, message: "Restaurant not found" });
        }

        const newRating = new ratingsModel({
            restaurantId: restaurantId,
            user: user,
            rating: rating
        });

        await newRating.save();

        restaurant.ratings = restaurant.ratings || [];

        restaurant.ratings.push(newRating.rating);
        await restaurant.save();

        res.json({ success: true, message: "Rating added successfully", data: newRating });
    } catch (error) {
        console.error("Error adding rating:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

// Get Ratings from a Restaurant
app.get("/get-ratings/:restaurantId", async (req, res) => {
    try {
        const restaurantId = req.params.restaurantId;

        const restaurant = await userModel.findById(restaurantId);
        if (!restaurant) {
            return res.status(404).json({ success: false, message: "Restaurant not found" });
        }

        const ratings = await ratingsModel.find({ restaurantId: restaurantId });

        res.json({ success: true, data: ratings });
    } catch (error) {
        console.error("Error getting ratings:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

//getDetails for viewDetails
app.get('/details/:id', async (req, res) => {
    try {
      const itemId = req.params.id;
      const itemDetails = await userModel.findById(itemId); 
      res.json(itemDetails);
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

app.get("/", async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || PAGE_SIZE;
    const searchQuery = req.query.search;

    try {
        let query = {};

        if (searchQuery) {
            query = {
                $or: [
                    { name: { $regex: searchQuery, $options: 'i' } },
                    { location: { $regex: searchQuery, $options: 'i' } }
                ]
            };
        }

        const totalItems = await userModel.countDocuments(query);
        const totalPages = Math.ceil(totalItems / limit);
        const skip = (page - 1) * limit;

        const data = await userModel.find(query).skip(skip).limit(limit);

        res.json({
            success: true,
            data: data,
            currentPage: page,
            totalPages: totalPages
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

//create
app.post("/create", upload.single('image'),async(req,res)=>{
    console.log(req.body)
    console.log(req.file)
    const {name,location,restaurant_mobile,owner_mobile,restaurant_type,
    opening_hours,closing_hours,ratings}=req.body;
    const {filename}=req.file;
    const data = new userModel({
        name,
        location,
        restaurant_mobile,
        owner_mobile,
        restaurant_type,
        opening_hours,
        closing_hours,
        imageURL:filename,
        ratings: [],
      });
   
     await data.save();

    res.send({success: true, massage: "data saved successfuly"})
})

app.get('/images/:filename', (req, res) => {
    const filename = req.params.filename;
    const imagePath = path.join(__dirname, 'uploads', filename); // Path to the image directory
    console.log(__dirname,"__dirname path")
    
    console.log(imagePath,"image path")
    // Send the file as a response
    res.sendFile(imagePath, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        res.status(404).send('Image not found');
      }
    });
  });

//update
app.put("/update",async(req,res)=>{
    console.log(req.body)
    const{_id,...rest} = req.body
    console.log(rest)

    await userModel.updateOne({_id : _id}, rest)
    res.send({success : true, massage : "data upadated successfuly"})
})

//delete
app.delete("/delete/:id",async (req,res)=>{
    const id = req.params.id
    console.log(id)
    const data = await userModel.deleteOne({_id: id})
    res.send({success : true, message : "data deleted successfuly", data: data})
})

//form submission
// API route for user registration and login
app.post('/api/register', async (req, res) => {
  const { username, email, password, isLoginMode } = req.body;

  try {
    if (isLoginMode) {
      req.session.user = { email: email, password: password };

      // Login logic
      const user = await loginForm.findOne({ email, password });
      if (user) {
        res.json({ success: true, message: 'Login successful' });
      } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
    } else {
      // Registration logic
      const existingUser = await loginForm.findOne({ email });
      if (existingUser) {
        res.status(400).json({ success: false, message: 'Email already exists' });
      } else {
        const newUser = new loginForm({ username, email, password });
        await newUser.save();
        res.json({ success: true, message: 'Registration successful' });
      }
    }
} catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
}
});

//logOut
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    return res.json({ success: true, message: 'Logout successful' });
  });
});

mongoose.connect("mongodb://127.0.0.1:27017/zomatocrud")
.then(()=>{
    console.log("connected");
    app.listen(PORT,()=> console.log("Server is running"))
})
.catch((err)=>{
    console.log(err)
})


