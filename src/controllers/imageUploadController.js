const { supabase, supabaseAdmin} = require("../supabase");
const { decode } = require("base64-arraybuffer");
const customError = require("../utils/errors");
const path = require("path");
const {createClient} = require("@supabase/supabase-js");

const uploadImage = async (req, res) => {
    try {
        const files = await req.files();
        
        if (!files || !Array.isArray(files)) {
            return res.status(400).json(customError.badRequest({
                message: "Please upload an image",
            }));
        }
        
        const listOfImageUrls = [];
        
        for (const file of files) {
            // Decode files buffer to base64
            const fileBase64 = decode(file.buffer.toString("base64"));
            
            const { data, error } = await supabase.storage
                .from("images")
                .upload(file.originalname, fileBase64, {
                    contentType: file.contentType,
                })
            
            if (error) {
                throw error;
            }
            
            // Get public url of the uploaded file
            const { data: image } = supabase.storage
                .from("images")
                .getPublicUrl(data.path);
            
            listOfImageUrls.push(image.publicUrl);
        }
        
        return res.status(200).json({
            message: "Successfully uploaded image",
            data: {
                images: listOfImageUrls,
            }
        });
    } catch (error) {
        return res.status(500).json(customError.internalServerError({
            message: error.message,
            details: {
                message: error.details,
            }
        }));
    }
}

const generateSignedUploadUrl = async (req, res) => {
    const userId = req.userId;
    
    // Get the desired filename from the frontend request
    const { fileName, fileType } = req.body;
    
    if (!fileName || !fileType) {
        return res.status(400).json(customError.badRequest({
             message: 'fileName and fileType are required.'
        }));
    }

    if (fileType !== "image/jpg" && fileType !== "image/png" && fileType !== "image/jpeg" && fileType !== "image/gif") {
        return res.status(400).json(customError.badRequest({
            message: "Invalid file type"
        }))
    }
    
    const fileExt = fileType.split("/")[0];
    const fileNameSplits = fileName.split(".");
    
    try {
        // Generate a unique path for the file to prevent overwrites.
        const uniqueFileName =
            fileNameSplits[0]
                .toLowerCase()
                .split(" ")
                .join("-") +
            "-" +
            Date.now();
        
        // const uniqueFileName = `${crypto.randomUUID()}-${fileName}`;
        const filePath = `images/${userId}/${uniqueFileName + "." + fileExt}`;
        
        const userToken = req.headers.authorization.split("Bearer ")[1];
        const authenticatedSupabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY,
            {
                global: {
                    headers: {
                        Authorization: `Bearer ${userToken}`
                    }
                }
            }
        );
        
        // Generate a signed URL that allows uploading to the specified path.
        // The URL expires in 60 seconds.
        const { data, error } = await supabaseAdmin.storage
            .from('images') // Your bucket name
            .createSignedUploadUrl(filePath, 60); // 60 = expires in 60 seconds
        
        if (error) {
            console.error('Error creating signed URL:', error);
            return res.status(500).json({ message: 'Could not create upload URL.' });
        }
        
        // Send the signed URL and the path back to the frontend.
        // The frontend will use the `signedUrl` to upload the file.
        // The `path` will be used to construct the final public URL later.
        res.status(200).json({
            data: {
                signedUrl: data.signedUrl,
                path: data.path,
            }
        });
        
    } catch (err) {
        console.error(err);
        res.status(500).json(customError.internalServerError({ message: 'Internal server error.' }));
    }
}

module.exports = {
    uploadImage,
    generateSignedUploadUrl
}